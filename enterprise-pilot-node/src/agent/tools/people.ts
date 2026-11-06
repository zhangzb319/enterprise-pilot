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
}
