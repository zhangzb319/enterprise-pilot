import json

import httpx

from app.core.config import get_settings
from app.core.exceptions import AppError


class LlmClient:
    async def chat(self, messages: list[dict[str, str]], temperature: float = 0.2) -> str:
        settings = get_settings()
        if not settings.zhipu_api_key:
            raise AppError("ZHIPU_API_KEY is not configured", 503)
        payload = {"model": settings.zhipu_chat_model, "messages": messages, "temperature": temperature}
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(f"{settings.zhipu_base_url.rstrip('/')}/chat/completions", headers={"Authorization": f"Bearer {settings.zhipu_api_key}"}, json=payload)
        if response.is_error:
            raise AppError(f"LLM request failed: {response.text}", 502)
        return response.json()["choices"][0]["message"]["content"]

    async def chat_stream(self, messages: list[dict[str, str]], temperature: float = 0.2):
        settings = get_settings()
        if not settings.zhipu_api_key:
            raise AppError("ZHIPU_API_KEY is not configured", 503)
        payload = {"model": settings.zhipu_chat_model, "messages": messages, "temperature": temperature, "stream": True}
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{settings.zhipu_base_url.rstrip('/')}/chat/completions", headers={"Authorization": f"Bearer {settings.zhipu_api_key}"}, json=payload) as response:
                if response.is_error:
                    raise AppError(f"LLM request failed: {await response.aread()}", 502)
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        delta = json.loads(data)["choices"][0]["delta"].get("content")
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
                    if delta:
                        yield delta

    async def embeddings(self, texts: list[str]) -> list[list[float]]:
        settings = get_settings()
        if not settings.zhipu_api_key:
            raise AppError("ZHIPU_API_KEY is not configured", 503)
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(f"{settings.zhipu_base_url.rstrip('/')}/embeddings", headers={"Authorization": f"Bearer {settings.zhipu_api_key}"}, json={"model": settings.zhipu_embedding_model, "input": texts})
        if response.is_error:
            raise AppError(f"Embedding request failed: {response.text}", 502)
        return [item["embedding"] for item in response.json()["data"]]
