/** Agent 路由。SSE 事件约定与 Python 版完全一致:

- 默认事件(无 event 行): {"text": "..."} 增量正文
- event: step    {"tool", "status": running|done, "summary"}
- event: sources {"items": [{"document_id", "title"}]}
- event: done    {}
- event: error   {"message"}
 */

import type { FastifyInstance } from "fastify";
import { AgentService } from "../services/agentService.js";
import { AppError } from "../errors.js";

const service = new AgentService();

type ChatBody = {
    message?: string;
    history?: { role?: string; content?: string }[];
};

function sse(event: string | null, data: unknown): string {
    const payload = JSON.stringify(data);
    return event ? `event: ${event}\ndata: ${payload}\n\n` : `data: ${payload}\n\n`;
}

/** 把底层网络错误的原因挖出来:DNS 失败/连接被拒/TLS 错误/超时各有不同文案。 */
function describeError(error: unknown): string {
    if (!(error instanceof Error)) return String(error);
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) {
        const code = (cause as { code?: string }).code;
        return code ? `${error.message} (${code}: ${cause.message})` : `${error.message} (${cause.message})`;
    }
    return error.message;
}

export async function agentRoutes(app: FastifyInstance): Promise<void> {
    app.post("/api/v1/agent/chat", async (request, reply) => {
        const body = (request.body ?? {}) as ChatBody;
        const message = (body.message ?? "").trim();
        if (!message) {
            throw new AppError("message 不能为空", 400);
        }
        const authorization = request.headers.authorization ?? null;
        const { answer, steps, sources } = await service.chat(message, authorization, body.history);
        return { code: 200, message: "success", data: { answer, steps, sources } };
    });

    app.post("/api/v1/agent/chat/stream", async (request, reply) => {
        const body = (request.body ?? {}) as ChatBody;
        const message = (body.message ?? "").trim();
        if (!message) {
            throw new AppError("message 不能为空", 400);
        }
        const authorization = request.headers.authorization ?? null;

        reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        });

        try {
            for await (const event of service.stream(message, authorization, body.history)) {
                if (event.kind === "delta") {
                    reply.raw.write(sse(null, { text: event.data.text }));
                } else if (event.kind === "step") {
                    reply.raw.write(sse("step", event.data));
                } else if (event.kind === "sources") {
                    reply.raw.write(sse("sources", event.data));
                }
            }
            reply.raw.write(sse("done", {}));
        } catch (error) {
            // 失败要推给前端,而不是断开连接。
            // undici 的网络错误 message 恒为 "fetch failed",真实原因在 cause 里,
            // 不带出来前端只能显示一句无用的 "请求失败：fetch failed"。
            const message = describeError(error);
            console.error(`[agent] 对话失败: ${message}`);
            reply.raw.write(sse("error", { message }));
        } finally {
            reply.raw.end();
        }
        return reply;
    });
}
