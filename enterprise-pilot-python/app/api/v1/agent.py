import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.common.deps import optional_authorization
from app.common.response import ApiResponse, ok
from app.schemas.agent import AgentChatRequest, AgentChatResponse
from app.services.agent_service import AgentService

router = APIRouter(prefix="/agent", tags=["agent"])
service = AgentService()


@router.post("/chat", response_model=ApiResponse[AgentChatResponse])
async def chat(request: AgentChatRequest, authorization: str | None = Depends(optional_authorization)):
    answer, steps, sources = await service.chat(request.message, request.authorization or authorization, request.history)
    return ok(AgentChatResponse(answer=answer, steps=steps, sources=sources))


@router.post("/chat/stream")
async def chat_stream(request: AgentChatRequest, authorization: str | None = Depends(optional_authorization)):
    """SSE 事件约定:

    - 默认事件(无 event 行): {"text": "..."} 增量正文
    - event: step    {"tool", "status": running|done, "summary"}
    - event: sources {"items": [{"document_id", "title"}]}
    - event: done    {}
    - event: error   {"message"}
    """

    async def event_gen():
        try:
            async for event in service.stream(request.message, request.authorization or authorization, request.history):
                if event.kind == "delta":
                    yield f"data: {json.dumps({'text': event.data['text']}, ensure_ascii=False)}\n\n"
                elif event.kind == "step":
                    yield f"event: step\ndata: {json.dumps(event.data, ensure_ascii=False)}\n\n"
                elif event.kind == "sources":
                    yield f"event: sources\ndata: {json.dumps(event.data, ensure_ascii=False)}\n\n"
            yield "event: done\ndata: {}\n\n"
        except Exception as exc:  # noqa: BLE001 - 失败要推给前端,而不是断开连接
            yield f"event: error\ndata: {json.dumps({'message': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")
