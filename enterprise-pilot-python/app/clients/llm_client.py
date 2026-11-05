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

    async def chat_with_tools(self, messages: list[dict], tools: list[dict], temperature: float = 0.2) -> tuple[dict, dict]:
        """带工具的非流式调用,返回 (message, usage)。

        必须走非流式:实测 GLM 在 stream=True 时会忽略 tools,直接返回正文,
        因此"边流式边调工具"不可行,决策与作答必须分成两次调用。
        """
        settings = get_settings()
        if not settings.zhipu_api_key:
            raise AppError("ZHIPU_API_KEY is not configured", 503)
        payload = {"model": settings.zhipu_chat_model, "messages": messages, "temperature": temperature, "tools": tools, "tool_choice": "auto"}
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(f"{settings.zhipu_base_url.rstrip('/')}/chat/completions", headers={"Authorization": f"Bearer {settings.zhipu_api_key}"}, json=payload)
        if response.is_error:
            raise AppError(f"LLM request failed: {response.text}", 502)
        body = response.json()
        return body["choices"][0]["message"], body.get("usage") or {}

    async def embeddings(self, texts: list[str]) -> list[list[float]]:
        settings = get_settings()
        if not settings.zhipu_api_key:
            raise AppError("ZHIPU_API_KEY is not configured", 503)
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(f"{settings.zhipu_base_url.rstrip('/')}/embeddings", headers={"Authorization": f"Bearer {settings.zhipu_api_key}"}, json={"model": settings.zhipu_embedding_model, "input": texts})
        if response.is_error:
            raise AppError(f"Embedding request failed: {response.text}", 502)
        return [item["embedding"] for item in response.json()["data"]]
