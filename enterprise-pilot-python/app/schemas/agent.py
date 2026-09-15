from pydantic import BaseModel, Field


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1)
    authorization: str | None = None
    history: list[dict] | None = None


class AgentChatResponse(BaseModel):
    answer: str
    tool_result: dict | None = None
