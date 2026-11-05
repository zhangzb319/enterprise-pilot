"""AI 助手服务层。

职责边界:本层负责组织 Agent 循环、汇总指标并上报 qa_log,
具体"调哪个工具"由 loop 里的模型决策完成,不再有硬编码关键词分支。
"""

import logging
import time

from app.agent import loop
from app.clients.java_client import JavaClient

logger = logging.getLogger(__name__)


class AgentService:
    def __init__(self) -> None:
        self.java = JavaClient()

    async def stream(self, message: str, authorization: str | None = None, history: list[dict] | None = None):
        """产出 loop 的事件流,结束后异步写问答日志。"""
        started = time.monotonic()
        answer_parts: list[str] = []
        used_tools: list[str] = []
        sources: list[dict] = []

        async for event in loop.stream(message, authorization, history):
            if event.kind == "delta":
                answer_parts.append(event.data["text"])
            elif event.kind == "step" and event.data.get("status") == "done":
                used_tools.append(event.data["tool"])
            elif event.kind == "sources":
                sources = event.data["items"]
            yield event

        await self._log_qa(
            question=message,
            answer="".join(answer_parts),
            authorization=authorization,
            tools=used_tools,
            sources=sources,
            latency_ms=int((time.monotonic() - started) * 1000),
        )

    async def chat(
        self,
        message: str,
        authorization: str | None = None,
        history: list[dict] | None = None,
    ) -> tuple[str, list[dict], list[dict]]:
        """非流式入口,供流式不可用时的前端兜底。"""
        answer_parts: list[str] = []
        steps: list[dict] = []
        sources: list[dict] = []

        async for event in self.stream(message, authorization, history):
            if event.kind == "delta":
                answer_parts.append(event.data["text"])
            elif event.kind == "step":
                steps.append(event.data)
            elif event.kind == "sources":
                sources = event.data["items"]

        return "".join(answer_parts), steps, sources

    async def _log_qa(
        self,
        question: str,
        answer: str,
        authorization: str | None,
        tools: list[str],
        sources: list[dict],
        latency_ms: int,
    ) -> None:
        # 未登录调用不落库(qa_log 需要 user_id),日志失败也不影响对话
        if not authorization:
            return
        try:
            await self.java.log_qa(
                {
                    "question": question,
                    "answer": answer,
                    "referencedDocs": [item["document_id"] for item in sources],
                    "tools": tools,
                    "latencyMs": latency_ms,
                },
                authorization,
            )
        except Exception as exc:  # noqa: BLE001 - 日志属于旁路能力
            logger.warning("上报问答日志失败: %s", exc)
