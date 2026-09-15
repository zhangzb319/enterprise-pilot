import httpx
from app.core.config import get_settings
from app.core.exceptions import AppError


class JavaClient:
    async def _get(self, path: str, authorization: str | None) -> list[dict]:
        headers = {"Authorization": authorization} if authorization else {}
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(f"{get_settings().java_backend_url.rstrip('/')}{path}", headers=headers)
        if response.is_error:
            raise AppError("Java backend request failed", 502)
        body = response.json()
        if body.get("code") != 200:
            raise AppError(body.get("message", "Java backend rejected request"), 400)
        return body.get("data") or []

    async def my_bookings(self, authorization: str | None) -> list[dict]:
        return await self._get("/api/meeting/bookings/my", authorization)

    async def my_projects(self, authorization: str | None) -> list[dict]:
        return await self._get("/api/projects/my", authorization)

    async def my_tasks(self, authorization: str | None) -> list[dict]:
        projects = await self.my_projects(authorization)
        tasks: list[dict] = []
        for project in projects:
            project_tasks = await self._get(f"/api/projects/{project.get('id')}/tasks", authorization)
            for task in project_tasks:
                task["projectName"] = project.get("projectName")
            tasks.extend(project_tasks)
        return tasks
