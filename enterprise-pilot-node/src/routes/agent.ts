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
            // 失败要推给前端,而不是断开连接
            reply.raw.write(
                sse("error", { message: error instanceof Error ? error.message : String(error) }),
            );
        } finally {
            reply.raw.end();
        }
        return reply;
    });
}
