/** 会议相关工具:我的预订、会议室查询。 */

import { ToolContext, ToolOutcome, tool } from "../registry.js";
import { JavaClient } from "../../clients/javaClient.js";
import { clampInt, normalizeDate } from "./util.js";

const java = new JavaClient();

const BOOKING_STATUS: Record<number, string> = { 0: "已取消", 1: "待开始", 2: "进行中", 3: "已结束" };

export function registerMeetingTools(): void {
    tool(
        "list_my_bookings",
        "查询当前登录用户自己的会议室预订记录。用户问「我有哪些会议」「这周的开会安排」时使用,可按日期区间过滤。",
        {
            type: "object",
            properties: {
                from_date: { type: "string", description: "起始日期 YYYY-MM-DD,可省略表示不限" },
                to_date: { type: "string", description: "结束日期 YYYY-MM-DD,可省略表示不限" },
            },
            required: [],
        },
        async (ctx: ToolContext, args) => {
            const rows = await java.myBookings(ctx.authorization);
            const fromDate = normalizeDate(args.from_date);
            const toDate = normalizeDate(args.to_date);

            const items: Record<string, unknown>[] = [];
            for (const row of rows) {
                if (row.status === 0) continue; // 已取消的不展示
                const start = String(row.startTime ?? "");
                const day = start.slice(0, 10);
                if (fromDate && day && day < fromDate) continue;
                if (toDate && day && day > toDate) continue;
                items.push({
                    title: row.title,
                    room: row.roomName,
                    start,
                    end: row.endTime,
                    status: BOOKING_STATUS[row.status as number] ?? "未知",
                });
            }

            if (items.length === 0) {
                return new ToolOutcome(
                    "没有查到会议",
                    { bookings: [], hint: "该时间范围内没有会议安排,请如实告知用户" },
                );
            }
            return new ToolOutcome(`查到 ${items.length} 场会议`, { bookings: items });
        },
    );

    tool(
        "list_meeting_rooms",
        "查询公司会议室清单,包含名称、楼层、容纳人数与设备。用户问「有哪些会议室」「能坐10人的会议室」时使用。",
        {
            type: "object",
            properties: {
                capacity_min: { type: "integer", description: "最小容纳人数,可省略" },
            },
            required: [],
        },
        async (ctx: ToolContext, args) => {
            const rows = await java.meetingRooms(ctx.authorization);
            const threshold = args.capacity_min == null ? 0 : clampInt(args.capacity_min, 0, 0, 10_000);

            const items = rows
                .filter((row) => row.status !== 0 && (Number(row.capacity) || 0) >= threshold)
                .map((row) => ({
                    name: row.roomName,
                    floor: row.floor,
                    capacity: row.capacity,
                    equipment: row.equipment,
                }));

            if (items.length === 0) {
                return new ToolOutcome("没有符合条件的会议室", { rooms: [], hint: "没有满足条件的会议室" });
            }
            return new ToolOutcome(`查到 ${items.length} 间会议室`, { rooms: items });
        },
    );
}
