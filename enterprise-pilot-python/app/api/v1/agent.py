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
    answer, tool_result = await service.chat(request.message, request.authorization or authorization, request.history)
    return ok(AgentChatResponse(answer=answer, tool_result=tool_result))


@router.post("/chat/stream")
async def chat_stream(request: AgentChatRequest, authorization: str | None = Depends(optional_authorization)):
    async def event_gen():
        try:
            messages, tool_result = await service.prepare(request.message, request.authorization or authorization, request.history)
            if tool_result:
                yield f"event: tool\ndata: {json.dumps(tool_result, ensure_ascii=False)}\n\n"
            async for delta in service.llm.chat_stream(messages):
                yield f"data: {json.dumps({'text': delta}, ensure_ascii=False)}\n\n"
            yield "event: done\ndata: {}\n\n"
        except Exception as exc:  # noqa: BLE001 - surface failures to the client stream
            yield f"event: error\ndata: {json.dumps({'message': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")
