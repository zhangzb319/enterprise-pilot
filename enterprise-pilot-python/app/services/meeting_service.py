from app.clients.asr_client import AsrClient
from app.clients.llm_client import LlmClient


class MeetingService:
    def __init__(self) -> None:
        self.llm, self.asr = LlmClient(), AsrClient()

    async def summarize(self, transcript: str) -> str:
        return await self.llm.chat([
            {"role": "system", "content": "You summarize enterprise meetings in Chinese. Include: 摘要, 决策, 待办事项（负责人和截止日期如有）."},
            {"role": "user", "content": transcript},
        ])

    async def transcribe(self, audio_url: str) -> str:
        return await self.asr.transcribe_url(audio_url)
