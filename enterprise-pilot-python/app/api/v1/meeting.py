from fastapi import APIRouter
from app.common.response import ApiResponse, ok
from app.schemas.meeting import MeetingSummaryRequest, MeetingSummaryResponse, TranscriptRequest
from app.services.meeting_service import MeetingService

router = APIRouter(prefix="/meetings", tags=["meetings"])
service = MeetingService()


@router.post("/summary", response_model=ApiResponse[MeetingSummaryResponse])
async def summarize(request: MeetingSummaryRequest):
    return ok(MeetingSummaryResponse(booking_id=request.booking_id, summary=await service.summarize(request.transcript)))


@router.post("/transcript", response_model=ApiResponse[dict])
async def transcribe(request: TranscriptRequest):
    return ok({"transcript": await service.transcribe(request.audio_url)})
