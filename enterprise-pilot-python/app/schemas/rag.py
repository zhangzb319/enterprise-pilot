from pydantic import BaseModel, Field


class IngestTextRequest(BaseModel):
    document_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=128)
    content: str = Field(min_length=1)
    category: str | None = None


class AskRequest(BaseModel):
    question: str = Field(min_length=1)
    top_k: int = Field(default=4, ge=1, le=10)


class SourceChunk(BaseModel):
    document_id: str
    title: str
    content: str


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]


class DocumentItem(BaseModel):
    document_id: str
    title: str
    category: str | None = None
    chunk_count: int = 0
    created_at: str | None = None


class ChunkItem(BaseModel):
    index: int
    content: str


class DocumentDetail(BaseModel):
    document_id: str
    title: str
    category: str | None = None
    created_at: str | None = None
    chunks: list[ChunkItem]
