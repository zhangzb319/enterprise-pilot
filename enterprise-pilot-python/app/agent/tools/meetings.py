"""会议相关工具:我的预订、会议室查询。"""

from app.agent.registry import ToolContext, ToolOutcome, tool
from app.clients.java_client import JavaClient

_java = JavaClient()

_BOOKING_STATUS = {0: "已取消", 1: "待开始", 2: "进行中", 3: "已结束"}


def _normalize_date(value: str | None) -> str | None:
    """模型可能给出 2026/11/01 或 2026.11.01,统一成 YYYY-MM-DD 再做字符串比较。"""
    if not value:
        return None
    return value.strip().replace("/", "-").replace(".", "-")[:10]


@tool(
    "list_my_bookings",
    "查询当前登录用户自己的会议室预订记录。用户问「我有哪些会议」「这周的开会安排」时使用,可按日期区间过滤。",
    {
        "type": "object",
        "properties": {
            "from_date": {"type": "string", "description": "起始日期 YYYY-MM-DD,可省略表示不限"},
            "to_date": {"type": "string", "description": "结束日期 YYYY-MM-DD,可省略表示不限"},
        },
        "required": [],
    },
)
async def list_my_bookings(
    ctx: ToolContext,
    from_date: str | None = None,
    to_date: str | None = None,
) -> ToolOutcome:
    rows = await _java.my_bookings(ctx.authorization)
    start_date = _normalize_date(from_date)
    end_date = _normalize_date(to_date)

    items: list[dict] = []
    for row in rows:
        if row.get("status") == 0:  # 已取消的不展示
            continue
        start = str(row.get("startTime") or "")
        day = start[:10]
        if start_date and day and day < start_date:
            continue
        if end_date and day and day > end_date:
            continue
        items.append(
            {
                "title": row.get("title"),
                "room": row.get("roomName"),
                "start": start,
                "end": row.get("endTime"),
                "status": _BOOKING_STATUS.get(row.get("status"), "未知"),
            }
        )

    if not items:
        return ToolOutcome("没有查到会议", {"bookings": [], "hint": "该时间范围内没有会议安排,请如实告知用户"})
    return ToolOutcome(f"查到 {len(items)} 场会议", {"bookings": items})


@tool(
    "list_meeting_rooms",
    "查询公司会议室清单,包含名称、楼层、容纳人数与设备。用户问「有哪些会议室」「能坐10人的会议室」时使用。",
    {
        "type": "object",
        "properties": {
            "capacity_min": {"type": "integer", "description": "最小容纳人数,可省略"},
        },
        "required": [],
    },
)
async def list_meeting_rooms(ctx: ToolContext, capacity_min: int | None = None) -> ToolOutcome:
    rows = await _java.meeting_rooms(ctx.authorization)
    threshold = int(capacity_min) if capacity_min else 0

    items = [
        {
            "name": row.get("roomName"),
            "floor": row.get("floor"),
            "capacity": row.get("capacity"),
            "equipment": row.get("equipment"),
        }
        for row in rows
        if row.get("status") != 0 and (row.get("capacity") or 0) >= threshold
    ]

    if not items:
        return ToolOutcome("没有符合条件的会议室", {"rooms": [], "hint": "没有满足条件的会议室"})
    return ToolOutcome(f"查到 {len(items)} 间会议室", {"rooms": items})
