/** 项目与任务工具。 */

import { ToolContext, ToolOutcome, tool } from "../registry.js";
import { JavaClient } from "../../clients/javaClient.js";

const java = new JavaClient();

const PROJECT_STATUS: Record<number, string> = { 0: "草稿", 1: "进行中", 2: "已完成", 3: "已延期" };
const TASK_STATUS: Record<number, string> = { 0: "待开始", 1: "进行中", 2: "已完成" };

export function registerProjectTools(): void {
    tool(
        "list_my_projects",
        "查询当前登录用户参与的项目,包含负责人、进度与周期。用户问「我有哪些项目」「项目进展如何」时使用。",
        { type: "object", properties: {}, required: [] },
        async (ctx: ToolContext) => {
            const rows = await java.myProjects(ctx.authorization);
            const items = rows.map((row) => ({
                name: row.projectName,
                owner: row.ownerName,
                status: PROJECT_STATUS[row.status as number] ?? "未知",
                progress: `${row.progress ?? 0}%`,
                start: row.startDate,
                end: row.endDate,
            }));
            if (items.length === 0) {
                return new ToolOutcome("没有参与任何项目", { projects: [], hint: "该用户当前没有参与项目" });
            }
            return new ToolOutcome(`查到 ${items.length} 个项目`, { projects: items });
        },
    );

    tool(
        "list_my_tasks",
        "查询任务列表。默认只返回指派给当前用户的任务,only_mine=false 时返回其可见项目下的全部任务。用户问「我的任务」「还有什么没做完」时使用。",
        {
            type: "object",
            properties: {
                only_mine: { type: "boolean", description: "是否只看指派给我的任务,默认 true" },
                status: {
                    type: "string",
                    enum: ["待开始", "进行中", "已完成"],
                    description: "按状态过滤,可省略",
                },
            },
            required: [],
        },
        async (ctx: ToolContext, args) => {
            const rows = await java.myTasks(ctx.authorization);
            const onlyMine = args.only_mine !== false;
            const statusFilter = typeof args.status === "string" ? args.status : null;

            const items: Record<string, unknown>[] = [];
            for (const row of rows) {
                if (onlyMine && !row.isMine) continue;
                const statusText = TASK_STATUS[row.status as number] ?? "未知";
                if (statusFilter && statusText !== statusFilter) continue;
                items.push({
                    title: row.title,
                    project: row.projectName,
                    assignee: row.assigneeName,
                    status: statusText,
                    due: row.dueDate,
                });
            }

            if (items.length === 0) {
                return new ToolOutcome("没有符合条件的任务", { tasks: [], hint: "没有符合条件的任务" });
            }
            return new ToolOutcome(`查到 ${items.length} 个任务`, { tasks: items });
        },
    );
}
