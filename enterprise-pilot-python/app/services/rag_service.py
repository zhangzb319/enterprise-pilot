from datetime import datetime, timezone

from app.clients.llm_client import LlmClient
from app.schemas.rag import AskResponse, ChunkItem, DocumentDetail, DocumentItem, SourceChunk
from app.vector_store.chroma_client import ChromaStore


def split_text(text: str, size: int = 800, overlap: int = 120) -> list[str]:
    text = text.strip()
    chunks = [text[start:start + size] for start in range(0, len(text), size - overlap)]
    # 最后一块长度 <= overlap 时,它只是前一块的重复(步长 = size - overlap),直接丢弃
    if len(chunks) > 1 and len(chunks[-1]) <= overlap:
        chunks.pop()
    return chunks


class RagService:
    def __init__(self) -> None:
        self.llm, self.store = LlmClient(), ChromaStore()

    async def ingest(self, document_id: str, title: str, content: str, category: str | None = None) -> int:
        chunks = split_text(content)
        embeddings = await self.llm.embeddings(chunks)
        created_at = datetime.now(timezone.utc).isoformat()
        self.store.upsert([f"{document_id}:{index}" for index in range(len(chunks))], chunks, embeddings,
                          [{"document_id": document_id, "title": title, "category": category or "", "created_at": created_at} for _ in chunks])
        return len(chunks)

    async def ask(self, question: str, top_k: int) -> AskResponse:
        result = self.store.query((await self.llm.embeddings([question]))[0], top_k)
        documents, metadatas = result.get("documents", [[]])[0], result.get("metadatas", [[]])[0]
        sources = [SourceChunk(document_id=item["document_id"], title=item["title"], content=doc) for doc, item in zip(documents, metadatas)]
        context = "\n\n".join(f"[{source.title}]\n{source.content}" for source in sources)
        answer = await self.llm.chat([{"role": "system", "content": "Answer only from the supplied context. State when context is insufficient."}, {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}])
        return AskResponse(answer=answer, sources=sources)

    async def list_documents(self) -> list[DocumentItem]:
        metadatas = self.store.get_all().get("metadatas", [])
        docs: dict[str, dict] = {}
        for meta in metadatas:
            doc_id = meta.get("document_id")
            if not doc_id:
                continue
            if doc_id not in docs:
                docs[doc_id] = {"document_id": doc_id, "title": meta.get("title", ""), "category": meta.get("category") or None, "chunk_count": 0, "created_at": meta.get("created_at") or None}
            docs[doc_id]["chunk_count"] += 1
        return [DocumentItem(**item) for item in sorted(docs.values(), key=lambda d: d["document_id"])]

    async def get_document(self, document_id: str) -> DocumentDetail | None:
        result = self.store.get_document(document_id)
        metadatas, documents = result.get("metadatas", []), result.get("documents", [])
        if not metadatas:
            return None
        return DocumentDetail(
            document_id=document_id,
            title=metadatas[0].get("title", ""),
            category=metadatas[0].get("category") or None,
            created_at=metadatas[0].get("created_at") or None,
            chunks=[ChunkItem(index=i, content=doc) for i, doc in enumerate(documents)],
        )

    async def delete_document(self, document_id: str) -> None:
        self.store.delete_by_document(document_id)

    async def categories(self) -> list[str]:
        metadatas = self.store.get_all().get("metadatas", [])
        used = {meta.get("category") for meta in metadatas if meta.get("category")}
        return sorted(used | {"制度", "手册", "FAQ", "技术文档", "其他"})
