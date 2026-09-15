from fastapi import APIRouter
from app.common.response import ApiResponse, ok
from app.core.exceptions import AppError
from app.schemas.rag import AskRequest, AskResponse, DocumentDetail, DocumentItem, IngestTextRequest
from app.services.rag_service import RagService

router = APIRouter(prefix="/rag", tags=["rag"])
service = RagService()


@router.post("/documents", response_model=ApiResponse[dict])
async def ingest(request: IngestTextRequest):
    chunks = await service.ingest(request.document_id, request.title, request.content, request.category)
    return ok({"document_id": request.document_id, "chunk_count": chunks})


@router.get("/documents", response_model=ApiResponse[list[DocumentItem]])
async def list_documents():
    return ok(await service.list_documents())


@router.get("/documents/{document_id}", response_model=ApiResponse[DocumentDetail])
async def get_document(document_id: str):
    document = await service.get_document(document_id)
    if document is None:
        raise AppError("文档不存在", 404)
    return ok(document)


@router.delete("/documents/{document_id}", response_model=ApiResponse[dict])
async def delete_document(document_id: str):
    await service.delete_document(document_id)
    return ok({"document_id": document_id})


@router.get("/categories", response_model=ApiResponse[list[str]])
async def categories():
    return ok(await service.categories())


@router.post("/ask", response_model=ApiResponse[AskResponse])
async def ask(request: AskRequest):
    return ok(await service.ask(request.question, request.top_k))
