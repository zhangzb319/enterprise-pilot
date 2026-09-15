import httpx
from app.core.config import get_settings
from app.core.exceptions import AppError


class AsrClient:
    async def transcribe_url(self, audio_url: str) -> str:
        endpoint = get_settings().asr_endpoint
        if not endpoint:
            raise AppError("ASR_ENDPOINT is not configured; submit a transcript instead", 503)
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(endpoint, json={"audio_url": audio_url})
        if response.is_error:
            raise AppError("ASR request failed", 502)
        return response.json()["text"]
