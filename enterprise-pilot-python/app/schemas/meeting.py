from pydantic import BaseModel, Field


class MeetingSummaryRequest(BaseModel):
    booking_id: int = Field(gt=0)
    transcript: str = Field(min_length=1)


class ActionItem(BaseModel):
    content: str
    assignee: str | None = None
    due_date: str | None = None


class MeetingSummaryResponse(BaseModel):
    booking_id: int
    summary: str
    action_items: list[ActionItem] = []


class TranscriptRequest(BaseModel):
    audio_url: str = Field(min_length=1)
