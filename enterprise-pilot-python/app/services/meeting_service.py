import json
import re
from typing import Any
from app.clients.asr_client import AsrClient
from app.clients.llm_client import LlmClient


class MeetingService:
    def __init__(self) -> None:
        self.llm, self.asr = LlmClient(), AsrClient()

    async def summarize(self, transcript: str) -> dict[str, Any]:
        prompt = (
            "你是企业智能会议助手。请对以下会议转写记录进行深度提炼，并以 JSON 格式输出。\n"
            "输出 JSON 必须包含两个字段：\n"
            "1. \"summary\": 字符串，使用 Markdown 格式，包含【核心摘要】、【关键决议】、【讨论重点】。\n"
            "2. \"action_items\": 数组，提取会议中所有待办任务，每个对象包含：\n"
            "   - \"content\": 待办具体内容描述\n"
            "   - \"assignee\": 负责人姓名（若未明确指定则为 null）\n"
            "   - \"due_date\": 截止日期 YYYY-MM-DD（若未明确提及则为 null）\n\n"
            "请直接返回 JSON 纯文本，不要用 markdown 代码块包围。"
        )

        raw = await self.llm.chat([
            {"role": "system", "content": prompt},
            {"role": "user", "content": transcript},
        ])

        clean_text = raw.strip()
        if clean_text.startswith("```"):
            clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text)
            clean_text = re.sub(r"\s*```$", "", clean_text)

        try:
            parsed = json.loads(clean_text)
            if isinstance(parsed, dict) and "summary" in parsed:
                action_items = parsed.get("action_items")
                if not isinstance(action_items, list):
                    action_items = []
                return {
                    "summary": str(parsed["summary"]),
                    "action_items": action_items,
                }
        except Exception:
            pass

        # 兜底：若 LLM 没有返回合法 JSON，整篇作为 summary，并用正则提炼待办
        actions = []
        for line in raw.split("\n"):
            line = line.strip()
            if line.startswith("- [ ]") or line.startswith("TODO") or re.match(r"^\d+\.\s*(?:待办|任务)", line):
                actions.append({"content": line.lstrip("- [ ]0123456789. :："), "assignee": None, "due_date": None})

        return {"summary": raw, "action_items": actions}

    async def transcribe(self, audio_url: str) -> str:
        return await self.asr.transcribe_url(audio_url)
