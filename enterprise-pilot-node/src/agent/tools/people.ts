/** 通讯录工具。 */

import { ToolContext, ToolOutcome, tool } from "../registry.js";
import { JavaClient } from "../../clients/javaClient.js";
import { clampInt } from "./util.js";

const java = new JavaClient();

export function registerPeopleTools(): void {
    tool(
        "find_colleague",
        "按姓名、岗位或部门在通讯录中查找同事,返回部门、岗位与联系方式。用户问「XX是谁」「技术部有哪些人」时使用。",
        {
            type: "object",
            properties: {
                keyword: { type: "string", description: "姓名、岗位或部门关键词,留空则返回通讯录概览" },
                limit: { type: "integer", description: "最多返回条数,默认 10" },
            },
            required: [],
        },
        async (ctx: ToolContext, args) => {
            const rows = await java.directory(ctx.authorization);
            const keyword = (typeof args.keyword === "string" ? args.keyword : "").trim().toLowerCase();
            const maxItems = clampInt(args.limit, 10, 1, 30);

            const matched: Record<string, unknown>[] = [];
            for (const row of rows) {
                const haystack = [row.realName, row.nickname, row.position, row.deptName, row.employeeNo]
                    .map((value) => String(value ?? ""))
                    .join(" ")
                    .toLowerCase();
                if (keyword && !haystack.includes(keyword)) continue;
                matched.push({
                    name: row.realName || row.nickname,
                    dept: row.deptName,
                    position: row.position,
                    phone: row.phone,
                    email: row.email,
                });
                if (matched.length >= maxItems) break;
            }

            if (matched.length === 0) {
                return new ToolOutcome("没有找到匹配的同事", { colleagues: [], hint: "通讯录中没有匹配的人" });
            }
            return new ToolOutcome(`找到 ${matched.length} 位同事`, { colleagues: matched });
        },
    );

    tool(
        "send_direct_message",
        "给指定同事发送站内私信。用户指令如「帮我给李四发一条私信：下午3点会议室见」时使用。",
        {
            type: "object",
            properties: {
                receiver_name: { type: "string", description: "接收人姓名或用户名，如「李四」" },
                receiver_id: { type: "integer", description: "接收人用户ID，若已知可直接传入" },
                content: { type: "string", description: "私信内容" },
            },
            required: ["content"],
        },
        async (ctx: ToolContext, args) => {
            const content = String(args.content ?? "").trim();
            if (!content) {
                return new ToolOutcome("发送失败", { error: "私信内容不能为空" }, [], false);
            }

            let receiverId = args.receiver_id != null ? Number(args.receiver_id) : undefined;
            let receiverName = args.receiver_name ? String(args.receiver_name).trim() : undefined;

            if (receiverId == null && receiverName) {
                const rows = await java.directory(ctx.authorization);
                const q = receiverName.toLowerCase();
                const matched = rows.find((r) => {
                    const rn = String(r.realName ?? "").toLowerCase();
                    const un = String(r.username ?? "").toLowerCase();
                    return rn.includes(q) || un.includes(q);
                });
                if (matched) {
                    receiverId = Number(matched.id);
                    receiverName = String(matched.realName || matched.username);
                }
            }

            if (receiverId == null) {
                return new ToolOutcome(
                    "未找到接收人",
                    { error: "请提供准确的同事姓名或用户ID" },
                    [],
                    false,
                );
            }

            try {
                await java.sendMessage({ receiverId, content }, ctx.authorization);
                return new ToolOutcome(
                    `已成功给 ${receiverName ?? receiverId} 发送私信`,
                    { success: true, receiver: receiverName, content },
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return new ToolOutcome("发送私信失败", { error: message }, [], false);
            }
        },
        true,
    );
}
