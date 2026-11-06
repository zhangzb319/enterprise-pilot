/** AI 助手服务层。

职责边界:本层负责组织 Agent 循环、汇总指标并上报 qa_log,
具体"调哪个工具"由 loop 里的模型决策完成。
 */

import { stream as loopStream, type AgentEvent } from "../agent/loop.js";
import { JavaClient, type LogQaPayload } from "../clients/javaClient.js";

export type SourceItem = { document_id: string; title: string };

export class AgentService {
    private readonly java = new JavaClient();

    /** 产出 loop 的事件流,结束后异步写问答日志。 */
    async *stream(
        message: string,
        authorization: string | null = null,
        history?: { role?: string; content?: string }[],
    ): AsyncGenerator<AgentEvent> {
        const started = Date.now();
        const answerParts: string[] = [];
        const usedTools: string[] = [];
        let sources: SourceItem[] = [];

        for await (const event of loopStream(message, authorization, history)) {
            if (event.kind === "delta") {
                answerParts.push(event.data.text);
            } else if (event.kind === "step" && event.data.status === "done") {
                usedTools.push(event.data.tool);
            } else if (event.kind === "sources") {
                sources = event.data.items;
            }
            yield event;
        }

        await this.logQa(
            {
                question: message,
                answer: answerParts.join(""),
                authorization,
                tools: usedTools,
                sources,
                latencyMs: Date.now() - started,
            },
        );
    }

    /** 非流式入口,供流式不可用时的前端兜底。 */
    async chat(
        message: string,
        authorization: string | null = null,
        history?: { role?: string; content?: string }[],
    ): Promise<{ answer: string; steps: AgentEvent[]; sources: SourceItem[] }> {
        const answerParts: string[] = [];
        const steps: AgentEvent[] = [];
        let sources: SourceItem[] = [];

        for await (const event of this.stream(message, authorization, history)) {
            if (event.kind === "delta") answerParts.push(event.data.text);
            else if (event.kind === "step") steps.push(event);
            else if (event.kind === "sources") sources = event.data.items;
        }

        return { answer: answerParts.join(""), steps, sources };
    }

    /** 未登录调用不落库(qa_log 需要 user_id);日志失败只告警,不影响对话。 */
    private async logQa(input: {
        question: string;
        answer: string;
        authorization: string | null;
        tools: string[];
        sources: SourceItem[];
        latencyMs: number;
    }): Promise<void> {
        if (!input.authorization) return;
        const payload: LogQaPayload = {
            question: input.question,
            answer: input.answer,
            referencedDocs: input.sources.map((item) => item.document_id),
            tools: input.tools,
            latencyMs: input.latencyMs,
        };
        try {
            await this.java.logQa(payload, input.authorization);
        } catch (error) {
            console.warn(`[agent] 上报问答日志失败: ${error instanceof Error ? error.message : error}`);
        }
    }
}
