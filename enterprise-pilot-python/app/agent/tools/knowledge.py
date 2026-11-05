"""知识库检索工具。

注意:这里只做检索(rag.retrieve),不生成答案。答案统一由 Agent 的合成轮生成,
否则同一个问题会被 LLM 生成两次——这正是旧实现的问题。
"""

from app.agent.registry import ToolContext, ToolOutcome, tool
from app.services.rag_service import RagService

_service = RagService()

_MAX_CONTENT_CHARS = 800


@tool(
    "search_knowledge",
    "在企业知识库中检索公司制度、员工手册、FAQ、技术文档等内部资料。用户询问公司规定、流程、政策、产品文档时使用。",
    {
        "type": "object",
        "properties": {
            "question": {"type": "string", "description": "检索问题,保留用户原话中的关键信息"},
            "top_k": {"type": "integer", "description": "返回条数,默认 4"},
        },
        "required": ["question"],
    },
)
async def search_knowledge(ctx: ToolContext, question: str, top_k: int = 4) -> ToolOutcome:
    limit = max(1, min(int(top_k or 4), 10))
    chunks = await _service.retrieve(question, limit)

    if not chunks:
        return ToolOutcome(
            "知识库未命中",
            {"results": [], "hint": "知识库中没有相关资料,请如实告知用户,不要编造"},
        )

    results = [
        {"title": chunk.title, "content": chunk.content[:_MAX_CONTENT_CHARS]}
        for chunk in chunks
    ]

    # 同一篇文档可能命中多个分块,引用列表按 document_id 去重
    seen: set[str] = set()
    sources: list[dict] = []
    for chunk in chunks:
        if chunk.document_id in seen:
            continue
        seen.add(chunk.document_id)
        sources.append({"document_id": chunk.document_id, "title": chunk.title})

    return ToolOutcome(f"命中 {len(results)} 条资料", {"results": results}, sources)
