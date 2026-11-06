/** Python RAG 服务调用封装。

职责边界:知识库的检索(向量匹配)由 Python 负责(Chroma + embedding),
本服务只通过 HTTP 调它的 /api/v1/rag/retrieve,拿到分块后交给模型合成。
 */

import { config } from "../config.js";
import { AppError } from "../errors.js";

export type RagChunk = { document_id: string; title: string; content: string };

type ApiBody<T> = { code: number; message: string; data?: T };

export class RagClient {
    /** 只做检索,不生成答案;答案统一由 Agent 合成轮产出,避免同一问题被 LLM 生成两次。 */
    async retrieve(question: string, topK: number, authorization: string | null): Promise<RagChunk[]> {
        const response = await fetch(`${config.pythonRagUrl.replace(/\/$/, "")}/api/v1/rag/retrieve`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authorization ? { Authorization: authorization } : {}),
            },
            body: JSON.stringify({ question, top_k: topK }),
            signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
            throw new AppError(`RAG 服务请求失败(${response.status})`, 502);
        }
        const body = (await response.json()) as ApiBody<RagChunk[]>;
        if (body.code !== 200) {
            throw new AppError(body.message || "RAG 服务拒绝了该请求", 400);
        }
        return body.data ?? [];
    }
}
