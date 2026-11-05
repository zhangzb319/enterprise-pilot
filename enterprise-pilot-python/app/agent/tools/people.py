"""通讯录工具。"""

from app.agent.registry import ToolContext, ToolOutcome, tool
from app.clients.java_client import JavaClient

_java = JavaClient()


@tool(
    "find_colleague",
    "按姓名、岗位或部门在通讯录中查找同事,返回部门、岗位与联系方式。用户问「XX是谁」「技术部有哪些人」时使用。",
    {
        "type": "object",
        "properties": {
            "keyword": {"type": "string", "description": "姓名、岗位或部门关键词,留空则返回通讯录概览"},
            "limit": {"type": "integer", "description": "最多返回条数,默认 10"},
        },
        "required": [],
    },
)
async def find_colleague(ctx: ToolContext, keyword: str = "", limit: int = 10) -> ToolOutcome:
    rows = await _java.directory(ctx.authorization)
    text = (keyword or "").strip().lower()
    max_items = max(1, min(int(limit or 10), 30))

    matched = []
    for row in rows:
        haystack = " ".join(
            str(row.get(key) or "") for key in ("realName", "nickname", "position", "deptName", "employeeNo")
        ).lower()
        if text and text not in haystack:
            continue
        matched.append(
            {
                "name": row.get("realName") or row.get("nickname"),
                "dept": row.get("deptName"),
                "position": row.get("position"),
                "phone": row.get("phone"),
                "email": row.get("email"),
            }
        )
        if len(matched) >= max_items:
            break

    if not matched:
        return ToolOutcome("没有找到匹配的同事", {"colleagues": [], "hint": "通讯录中没有匹配的人"})
    return ToolOutcome(f"找到 {len(matched)} 位同事", {"colleagues": matched})
