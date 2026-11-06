/** Agent 主循环:规划轮(带工具) → 并行执行 → 合成轮(流式)。

为什么是两段式:实测 GLM 在 stream=true 时会忽略 tools、直接返回正文,
因此无法在流式调用里拿到 tool_calls。必须先用非流式调用做工具决策,
再用流式调用生成最终答案。

6 个工具都是相互独立的只读查询,模型可在一轮内并行调用完。
若调到 2 轮以上,第二轮通常会直接产出正文,答案将退化为非流式返回。
 */

import { LlmClient, type ChatMessage, type ToolCall } from "../clients/llmClient.js";
import { execute, specs, type ToolContext, type ToolSource } from "./registry.js";
import type { ToolSpec } from "./registry.js";

export const MAX_TOOL_ROUNDS = 1;
export const MAX_HISTORY = 10;

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export type AgentEvent =
    | { kind: "delta"; data: { text: string } }
    | { kind: "step"; data: { tool: string; status: "running" | "done"; summary?: string } }
    | { kind: "sources"; data: { items: ToolSource[] } };

export function systemPrompt(): string {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${WEEKDAYS[now.getDay()]}`;
    return `你是 Enterprise Pilot 企业办公平台的智能助手,用中文简洁作答。今天是 ${today}。

工具使用规则:
1. 涉及用户的个人事实(会议、项目、任务、同事)以及公司制度、流程、内部资料的问题,必须先调用工具获取事实,禁止凭记忆或常识编造。
2. 多个不相关的查询可以一次性并行发起多个工具调用。
3. 工具返回为空或报错时,如实说明查不到,并提示用户稍后重试。公司制度、政策、流程类问题一旦没有检索结果,绝不能凭常识编造。
4. 回答中用自然语言转述工具结果,不要暴露工具名、参数或原始 JSON。
5. 与办公无关的闲聊直接回答,无需调用工具。
6. 需要日期区间时,以今天为基准计算。`;
}

function parseArguments(call: ToolCall): Record<string, unknown> {
    try {
        const parsed = JSON.parse(call.function.arguments || "{}") as unknown;
        return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}

function historyMessages(history: { role?: string; content?: string }[] | undefined): ChatMessage[] {
    const messages: ChatMessage[] = [];
    for (const item of (history ?? []).slice(-MAX_HISTORY)) {
        const { role, content } = item;
        if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
            messages.push({ role, content });
        }
    }
    return messages;
}

/** 可注入接缝:测试用假 LLM/假执行器替换,行为见 tests/loop.test.ts。
 *  用模块级变量而非直接 new,是为了让 vitest 能对 ESM 导出函数打桩。 */
let llmFactory: () => LlmClient = () => new LlmClient();

export function createLlm(): LlmClient {
    return llmFactory();
}

/** 测试专用:替换 LLM 工厂,返回恢复函数。 */
export function setLlmFactory(factory: () => LlmClient): () => void {
    const previous = llmFactory;
    llmFactory = factory;
    return () => {
        llmFactory = previous;
    };
}

export function runTools(
    calls: ToolCall[],
    ctx: ToolContext,
): Promise<import("./registry.js").ToolOutcome[]> {
    return Promise.all(calls.map((call) => execute(call.function.name, parseArguments(call), ctx)));
}

export async function* stream(
    message: string,
    authorization: string | null = null,
    history?: { role?: string; content?: string }[],
): AsyncGenerator<AgentEvent> {
    const llm = createLlm();
    const ctx: ToolContext = { authorization };
    const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt() },
        ...historyMessages(history),
        { role: "user", content: message },
    ];

    const collectedSources = new Map<string, ToolSource>();

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const { message: reply } = await llm.chatWithTools(messages, specs() as never);
        const calls = reply.tool_calls ?? [];

        if (calls.length === 0) {
            // 无需工具,规划轮产出的就是最终答案,省掉一次调用
            const text = reply.content ?? "";
            if (text) yield { kind: "delta", data: { text } };
            return;
        }

        messages.push({ role: "assistant", content: reply.content ?? "", tool_calls: calls });

        for (const call of calls) {
            yield { kind: "step", data: { tool: call.function.name, status: "running" } };
        }

        const outcomes = await runTools(calls, ctx);

        for (const [call, outcome] of calls.map((call, index) => [call, outcomes[index]] as const)) {
            messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: outcome.asToolMessage(),
            });
            yield {
                kind: "step",
                data: { tool: call.function.name, status: "done", summary: outcome.summary },
            };
            for (const source of outcome.sources) {
                if (!collectedSources.has(source.document_id)) {
                    collectedSources.set(source.document_id, source);
                }
            }
        }

        // 所有工具都不可用时,模型只会拿常识硬编(实测 glm-4-flash 会忽略提示词约束),
        // 这里直接给出确定性回答,不让它生成。
        if (!outcomes.some((outcome) => outcome.ok)) {
            yield {
                kind: "delta",
                data: { text: "抱歉,查询服务暂时不可用,这次没能拿到数据。请稍后重试,或直接联系管理员。" },
            };
            return;
        }
    }

    if (collectedSources.size > 0) {
        yield { kind: "sources", data: { items: [...collectedSources.values()] } };
    }

    // 合成轮:带 tools 流式输出。实测 free/hy4 在合成轮不带 tools 时会以
    // <function=...> 伪标签文本幻觉出工具调用(5 次中 2 次);带 tools 则
    // 走真正的 function-call 通道,伪标签 0/5。若模型确实又调了工具
    // (finish_reason=tool_calls),chatStream 不产出正文,走下方兜底文案。
    let emitted = false;
    for await (const delta of llm.chatStream(messages, specs())) {
        emitted = true;
        yield { kind: "delta", data: { text: delta } };
    }

    if (!emitted) {
        yield { kind: "delta", data: { text: "抱歉,这次没有生成有效回复,请换个问法再试一次。" } };
    }
}

// re-export 便于测试与上层使用
export type { ToolSpec };
