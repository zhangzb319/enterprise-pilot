/** Node Agent 服务入口。

与 Java(:8080)、Python RAG 服务(:8001)平级;前端经 Vite 代理把
/ai 转发到本服务。只承载 Agent 对话,不直连数据库。
 */

import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { registerAllTools } from "./agent/tools/index.js";
import { agentRoutes } from "./routes/agent.js";
import { AppError } from "./errors.js";

async function main(): Promise<void> {
    registerAllTools();

    const app = Fastify({ logger: false });

    await app.register(cors, { origin: true });

    app.setErrorHandler((error: unknown, _request, reply) => {
        if (error instanceof AppError) {
            reply.status(error.status).send({ code: error.status, message: error.message, data: null });
            return;
        }
        const err = error as { validation?: unknown; message?: string };
        if (err.validation) {
            reply.status(400).send({ code: 400, message: err.message ?? "请求参数不合法", data: null });
            return;
        }
        console.error(`[node] 未处理异常: ${err.message ?? String(error)}`);
        reply.status(500).send({ code: 500, message: "系统内部错误", data: null });
    });

    await app.register(agentRoutes);

    app.get("/health", async () => ({ status: "ok", service: "enterprise-pilot-node" }));

    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`[node] Agent 服务已启动: http://localhost:${config.port}`);
}

main().catch((error) => {
    console.error("[node] 启动失败:", error);
    process.exit(1);
});
