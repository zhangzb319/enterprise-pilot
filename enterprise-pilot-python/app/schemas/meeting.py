from pydantic import BaseModel, Field


class MeetingSummaryRequest(BaseModel):
    booking_id: int = Field(gt=0)
    transcript: str = Field(min_length=1)


class MeetingSummaryResponse(BaseModel):
    booking_id: int
    summary: str


class TranscriptRequest(BaseModel):
    audio_url: str = Field(min_length=1)
