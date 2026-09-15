from app.clients.java_client import JavaClient
from app.clients.llm_client import LlmClient

SYSTEM_PROMPT = "You are an enterprise work assistant. Reply in Chinese and be concise."


class AgentService:
    def __init__(self) -> None:
        self.llm, self.java = LlmClient(), JavaClient()

    async def prepare(self, message: str, authorization: str | None, history: list[dict] | None = None) -> tuple[list[dict], dict | None]:
        if "我的会议" in message or "my meeting" in message.lower():
            bookings = await self.java.my_bookings(authorization)
            messages = [{"role": "system", "content": "Summarize the user's meeting bookings concisely in Chinese."}, {"role": "user", "content": str(bookings)}]
            return messages, {"name": "my_bookings", "data": bookings}
        if "我的项目" in message or "my project" in message.lower():
            projects = await self.java.my_projects(authorization)
            messages = [{"role": "system", "content": "Summarize the user's projects concisely in Chinese."}, {"role": "user", "content": str(projects)}]
            return messages, {"name": "my_projects", "data": projects}
        if "我的任务" in message or "my task" in message.lower():
            tasks = await self.java.my_tasks(authorization)
            messages = [{"role": "system", "content": "Summarize the user's tasks concisely in Chinese."}, {"role": "user", "content": str(tasks)}]
            return messages, {"name": "my_tasks", "data": tasks}
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        if history:
            messages.extend(history[-10:])
        messages.append({"role": "user", "content": message})
        return messages, None

    async def chat(self, message: str, authorization: str | None, history: list[dict] | None = None) -> tuple[str, dict | None]:
        messages, tool_result = await self.prepare(message, authorization, history)
        answer = await self.llm.chat(messages)
        return answer, tool_result
