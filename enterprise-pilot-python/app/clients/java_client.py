import httpx

from app.core.config import get_settings
from app.core.exceptions import AppError


class JavaClient:
    """Java 后端调用封装。

    所有请求都透传用户 JWT,权限判断完全由 Java 侧负责,Python 不重复实现。
    """

    async def _get(self, path: str, authorization: str | None) -> list[dict]:
        headers = {"Authorization": authorization} if authorization else {}
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(f"{get_settings().java_backend_url.rstrip('/')}{path}", headers=headers)
        if response.status_code in (401, 403):
            raise AppError("当前账号无权访问该数据", response.status_code)
        if response.is_error:
            raise AppError(f"Java 后端请求失败({response.status_code})", 502)
        body = response.json()
        if body.get("code") != 200:
            raise AppError(body.get("message", "Java 后端拒绝了该请求"), 400)
        return body.get("data") or []

    async def _post(self, path: str, payload: dict, authorization: str | None) -> dict | None:
        headers = {"Authorization": authorization} if authorization else {}
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(f"{get_settings().java_backend_url.rstrip('/')}{path}", json=payload, headers=headers)
        if response.is_error:
            raise AppError(f"Java 后端请求失败({response.status_code})", 502)
        body = response.json()
        if body.get("code") != 200:
            raise AppError(body.get("message", "Java 后端拒绝了该请求"), 400)
        return body.get("data")

    async def my_bookings(self, authorization: str | None) -> list[dict]:
        return await self._get("/api/meeting/bookings/my", authorization)

    async def meeting_rooms(self, authorization: str | None) -> list[dict]:
        return await self._get("/api/meeting/rooms", authorization)

    async def my_projects(self, authorization: str | None) -> list[dict]:
        return await self._get("/api/projects/my", authorization)

    async def my_tasks(self, authorization: str | None) -> list[dict]:
        """单次聚合查询,替代此前按项目逐个拉取的 N+1 实现。"""
        return await self._get("/api/projects/tasks/my", authorization)

    async def directory(self, authorization: str | None) -> list[dict]:
        return await self._get("/api/users/directory", authorization)

