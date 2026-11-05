"""项目与任务工具。"""

from app.agent.registry import ToolContext, ToolOutcome, tool
from app.clients.java_client import JavaClient

_java = JavaClient()

_PROJECT_STATUS = {0: "草稿", 1: "进行中", 2: "已完成", 3: "已延期"}
_TASK_STATUS = {0: "待开始", 1: "进行中", 2: "已完成"}


@tool(
    "list_my_projects",
    "查询当前登录用户参与的项目,包含负责人、进度与周期。用户问「我有哪些项目」「项目进展如何」时使用。",
    {"type": "object", "properties": {}, "required": []},
)
async def list_my_projects(ctx: ToolContext) -> ToolOutcome:
    rows = await _java.my_projects(ctx.authorization)
    items = [
        {
            "name": row.get("projectName"),
            "owner": row.get("ownerName"),
            "status": _PROJECT_STATUS.get(row.get("status"), "未知"),
            "progress": f"{row.get('progress') or 0}%",
            "start": row.get("startDate"),
            "end": row.get("endDate"),
        }
        for row in rows
    ]
    if not items:
        return ToolOutcome("没有参与任何项目", {"projects": [], "hint": "该用户当前没有参与项目"})
    return ToolOutcome(f"查到 {len(items)} 个项目", {"projects": items})


@tool(
    "list_my_tasks",
    "查询任务列表。默认只返回指派给当前用户的任务,only_mine=false 时返回其可见项目下的全部任务。用户问「我的任务」「还有什么没做完」时使用。",
    {
        "type": "object",
        "properties": {
            "only_mine": {"type": "boolean", "description": "是否只看指派给我的任务,默认 true"},
            "status": {"type": "string", "enum": ["待开始", "进行中", "已完成"], "description": "按状态过滤,可省略"},
        },
        "required": [],
    },
)
async def list_my_tasks(
    ctx: ToolContext,
    only_mine: bool = True,
    status: str | None = None,
) -> ToolOutcome:
    rows = await _java.my_tasks(ctx.authorization)

    items: list[dict] = []
    for row in rows:
        if only_mine and not row.get("isMine"):
            continue
        status_text = _TASK_STATUS.get(row.get("status"), "未知")
        if status and status_text != status:
            continue
        items.append(
            {
                "title": row.get("title"),
                "project": row.get("projectName"),
                "assignee": row.get("assigneeName"),
                "status": status_text,
                "due": row.get("dueDate"),
            }
        )

    if not items:
        return ToolOutcome("没有符合条件的任务", {"tasks": [], "hint": "没有符合条件的任务"})
    return ToolOutcome(f"查到 {len(items)} 个任务", {"tasks": items})
