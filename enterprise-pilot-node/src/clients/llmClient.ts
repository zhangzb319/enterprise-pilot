/** 智谱 GLM 客户端。

关键约束(实测):GLM 在 stream=true 时会忽略 tools、直接返回正文,
因此"流式 + 工具调用"不可行——工具决策必须走非流式 chatWithTools,
最终答案由独立的流式 chatStream 生成。这与 Python 版行为一致。
 */

import { config } from "../config.js";
import { AppError } from "../errors.js";

export type ChatMessage = {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
};

export type ToolCall = {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
};

export type ToolSpec = {
    type: "function";
    function: { name: string; description: string; parameters: object };
};

export type Usage = { prompt_tokens?: number; completion_tokens?: number };

function headers(): Record<string, string> {
    return { Authorization: `Bearer ${config.zhipuApiKey()}`, "Content-Type": "application/json" };
}

function endpoint(path: string): string {
    return `${config.zhipuBaseUrl.replace(/\/$/, "")}${path}`;
}

export class LlmClient {
    /** 非流式 + 工具定义:返回 (assistant message, usage)。 */
    async chatWithTools(
        messages: ChatMessage[],
        tools: ToolSpec[],
        temperature = 0.2,
    ): Promise<{ message: ChatMessage & { tool_calls?: ToolCall[] }; usage: Usage }> {
        const response = await this.post("/chat/completions", {
            model: config.zhipuChatModel,
            messages,
            temperature,
            tools,
            tool_choice: "auto",
        }, 60_000);
        const body = (await response.json()) as {
            choices: { message: ChatMessage & { tool_calls?: ToolCall[] } }[];
            usage?: Usage;
        };
        return { message: body.choices[0].message, usage: body.usage ?? {} };
    }

    /** 流式合成:逐段产出正文增量。
     *
     * tools 参数可选但强烈建议传(同 chatWithTools 的定义):实测 free/hy4
     * 在对话里已出现 tool 消息、而本次请求不带 tools 时,会以 <function=...>
     * 伪标签文本"幻觉调用";带 tools 则走正常通道(实测 0/5 泄漏)。
     * GLM 两种行为均兼容。
     */
    async *chatStream(messages: ChatMessage[], tools?: ToolSpec[], temperature = 0.2): AsyncGenerator<string> {
        const response = await this.post("/chat/completions", {
            model: config.zhipuChatModel,
            messages,
            temperature,
            ...(tools && tools.length > 0 ? { tools, tool_choice: "auto" } : {}),
            stream: true,
        }, 120_000);
        if (!response.body) {
            throw new AppError("LLM response body is empty", 502);
        }
        const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(splitLinesStream());
        for await (const line of reader) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") break;
            try {
                const delta = (JSON.parse(data) as { choices: { delta?: { content?: string } }[] })
                    .choices[0]?.delta?.content;
                if (delta) yield delta;
            } catch {
                // 跳过无法解析的心跳/杂项行
            }
        }
    }

    /** 统一的 LLM 请求入口:非 2xx 转成带响应体的 AppError,网络错误保留 cause。 */
    private async post(path: string, payload: unknown, timeoutMs: number): Promise<Response> {
        const url = endpoint(path);
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(timeoutMs),
            });
            if (!response.ok) {
                throw new AppError(`LLM request failed: ${await response.text()}`, 502);
            }
            return response;
        } catch (error) {
            if (error instanceof AppError) throw error;
            // fetch 的网络错误 message 恒为 "fetch failed",真实原因在 cause
            throw new AppError(describeNetworkError(url, error), 502);
        }
    }
}

/** 把 undici 的 "fetch failed" 展开成可定位的原因:DNS/连接被拒/TLS/超时。 */
function describeNetworkError(url: string, error: unknown): string {
    if (!(error instanceof Error)) return String(error);
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) {
        const code = (cause as { code?: string }).code;
        const hint = code === "UND_ERR_CONNECT_TIMEOUT" || cause.name === "TimeoutError"
            ? "请求超时"
            : code === "ECONNREFUSED"
                ? "目标服务拒绝连接"
                : code === "ENOTFOUND" || code === "EAI_AGAIN"
                    ? "域名解析失败"
                    : cause.message;
        return `LLM 请求失败(${hint}): ${code ?? cause.name}`;
    }
    return `LLM 请求失败: ${error.message}`;
}

/** SSE 按 \n 切分的 TransformStream。 */
function splitLinesStream(): TransformStream<string, string> {
    let buffer = "";
    return new TransformStream({
        transform(chunk, controller) {
            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
                controller.enqueue(line.replace(/\r$/, ""));
            }
        },
        flush(controller) {
            if (buffer) controller.enqueue(buffer.replace(/\r$/, ""));
        },
    });
}
