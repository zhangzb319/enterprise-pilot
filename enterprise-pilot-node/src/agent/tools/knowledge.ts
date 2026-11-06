/** 知识库检索工具:走 Python RAG 服务的 /api/v1/rag/retrieve。

注意:这里只做检索,不生成答案。答案统一由 Agent 的合成轮生成,
否则同一个问题会被 LLM 生成两次——这正是旧实现的问题。
 */

import { ToolContext, ToolOutcome, tool } from "../registry.js";
import { RagClient } from "../../clients/ragClient.js";
import { clampInt } from "./util.js";

const rag = new RagClient();
const MAX_CONTENT_CHARS = 800;

export function registerKnowledgeTool(): void {
    tool(
        "search_knowledge",
        "在企业知识库中检索公司制度、员工手册、FAQ、技术文档等内部资料。用户询问公司规定、流程、政策、产品文档时使用。",
        {
            type: "object",
            properties: {
                question: { type: "string", description: "检索问题,保留用户原话中的关键信息" },
                top_k: { type: "integer", description: "返回条数,默认 4" },
            },
            required: ["question"],
        },
        async (ctx: ToolContext, args) => {
            const question = String(args.question ?? "").trim();
            if (!question) {
                return new ToolOutcome("检索问题为空", { results: [], hint: "请给出明确的检索问题" }, [], false);
            }
            const topK = clampInt(args.top_k, 4, 1, 10);
            const chunks = await rag.retrieve(question, topK, ctx.authorization);

            if (chunks.length === 0) {
                return new ToolOutcome(
                    "知识库未命中",
                    { results: [], hint: "知识库中没有相关资料,请如实告知用户,不要编造" },
                );
            }

            const results = chunks.map((chunk) => ({
                title: chunk.title,
                content: chunk.content.slice(0, MAX_CONTENT_CHARS),
            }));

            // 同一篇文档可能命中多个分块,引用列表按 document_id 去重
            const seen = new Set<string>();
            const sources = chunks
                .filter((chunk) => !seen.has(chunk.document_id) && seen.add(chunk.document_id))
                .map((chunk) => ({ document_id: chunk.document_id, title: chunk.title }));

            return new ToolOutcome(`命中 ${results.length} 条资料`, { results }, sources);
        },
    );
}
