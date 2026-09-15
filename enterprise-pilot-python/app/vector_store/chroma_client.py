import chromadb
from app.core.config import get_settings


class ChromaStore:
    def __init__(self) -> None:
        self.collection = chromadb.PersistentClient(path=get_settings().chroma_persist_dir).get_or_create_collection("knowledge_chunks")

    def upsert(self, ids: list[str], documents: list[str], embeddings: list[list[float]], metadatas: list[dict]) -> None:
        self.collection.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)

    def query(self, embedding: list[float], top_k: int) -> dict:
        return self.collection.query(query_embeddings=[embedding], n_results=top_k, include=["documents", "metadatas"])

    def get_all(self) -> dict:
        return self.collection.get(include=["metadatas", "documents"])

    def get_document(self, document_id: str) -> dict:
        return self.collection.get(where={"document_id": document_id}, include=["metadatas", "documents"])

    def delete_by_document(self, document_id: str) -> None:
        self.collection.delete(where={"document_id": document_id})
