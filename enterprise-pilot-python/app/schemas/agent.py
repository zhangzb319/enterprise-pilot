from pydantic import BaseModel, Field


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1)
    authorization: str | None = None
    history: list[dict] | None = None


class AgentStep(BaseModel):
    tool: str
    status: str
    summary: str | None = None


class AgentSource(BaseModel):
    document_id: str
    title: str


class AgentChatResponse(BaseModel):
    answer: str
    steps: list[AgentStep] = []
    sources: list[AgentSource] = []
