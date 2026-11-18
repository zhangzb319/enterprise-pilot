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

    tool(
        "create_meeting_booking",
        "为用户预订会议室。用户指令如「帮我订明天下午2点到3点的一号会议室，主题是技术分享」时使用。开始与结束时间必须为具体日期时间，且晚于当前时间。",
        {
            type: "object",
            properties: {
                room_name: { type: "string", description: "会议室名称或编号，如「一号会议室」或「大会议室」" },
                room_id: { type: "integer", description: "会议室ID，若已知可直接传入" },
                title: { type: "string", description: "会议主题" },
                start_time: { type: "string", description: "开始时间，格式 YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DDTHH:mm:ss" },
                end_time: { type: "string", description: "结束时间，格式 YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DDTHH:mm:ss" },
            },
            required: ["title", "start_time", "end_time"],
        },
        async (ctx: ToolContext, args) => {
            const title = String(args.title ?? "").trim();
            if (!title) {
                return new ToolOutcome("预订失败", { error: "缺少会议主题" }, [], false);
            }
            const rawStart = String(args.start_time ?? "").trim();
            const rawEnd = String(args.end_time ?? "").trim();
            if (!rawStart || !rawEnd) {
                return new ToolOutcome("预订失败", { error: "缺少开始或结束时间" }, [], false);
            }

            const formatIso = (t: string) => {
                const s = t.replace(" ", "T");
                return s.length === 16 ? `${s}:00` : s;
            };
            const startTime = formatIso(rawStart);
            const endTime = formatIso(rawEnd);

            const rooms = await java.meetingRooms(ctx.authorization);
            let targetRoom: Record<string, unknown> | undefined;

            if (args.room_id != null) {
                targetRoom = rooms.find((r) => Number(r.id) === Number(args.room_id));
            }
            if (!targetRoom && args.room_name) {
                const q = String(args.room_name).toLowerCase().replace(/会议室$/, "").trim();
                targetRoom = rooms.find((r) => {
                    const name = String(r.roomName ?? "").toLowerCase();
                    return name.includes(q) || q.includes(name.replace(/会议室$/, ""));
                });
            }
            if (!targetRoom) {
                targetRoom = rooms.find((r) => r.status !== 0);
            }
            if (!targetRoom) {
                return new ToolOutcome("没有可用会议室", { error: "系统中未找到可用会议室" }, [], false);
            }

            const roomId = Number(targetRoom.id);
            const roomName = String(targetRoom.roomName);

            try {
                await java.createBooking(
                    { roomId, title, startTime, endTime },
                    ctx.authorization,
                );
                return new ToolOutcome(
                    `已成功预订 ${roomName} (${startTime.slice(5, 16)} ~ ${endTime.slice(11, 16)})`,
                    {
                        success: true,
                        booking: { title, room: roomName, start: startTime, end: endTime },
                    },
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return new ToolOutcome("会议预订失败", { error: message }, [], false);
            }
        },
        true,
    );
}
