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

    tool(
        "create_project_task",
        "在指定项目中创建新任务。用户指令如「在 Enterprise Pilot 项目里创建一个任务：修复构建问题，指派给张三」时使用。",
        {
            type: "object",
            properties: {
                project_name: { type: "string", description: "项目名称或关键字，如「Enterprise Pilot」" },
                project_id: { type: "integer", description: "项目ID，若已知可直接传入" },
                title: { type: "string", description: "任务标题" },
                description: { type: "string", description: "任务详细描述，可省略" },
                assignee_name: { type: "string", description: "指派人姓名，如「张三」，可省略" },
                assignee_id: { type: "integer", description: "指派人用户ID，可省略" },
                due_date: { type: "string", description: "截止日期 YYYY-MM-DD，可省略" },
            },
            required: ["title"],
        },
        async (ctx: ToolContext, args) => {
            const title = String(args.title ?? "").trim();
            if (!title) {
                return new ToolOutcome("创建任务失败", { error: "缺少任务标题" }, [], false);
            }

            const projects = await java.myProjects(ctx.authorization);
            let targetProj: Record<string, unknown> | undefined;

            if (args.project_id != null) {
                targetProj = projects.find((p) => Number(p.id) === Number(args.project_id));
            }
            if (!targetProj && args.project_name) {
                const q = String(args.project_name).toLowerCase().trim();
                targetProj = projects.find((p) =>
                    String(p.projectName ?? "").toLowerCase().includes(q),
                );
            }
            if (!targetProj && projects.length === 1) {
                targetProj = projects[0];
            }
            if (!targetProj) {
                return new ToolOutcome(
                    "未找到对应项目",
                    {
                        error: "未找到指定项目，请先确认项目名称",
                        availableProjects: projects.map((p) => p.projectName),
                    },
                    [],
                    false,
                );
            }

            const projectId = Number(targetProj.id);
            const projectName = String(targetProj.projectName);

            let assigneeId: number | undefined =
                args.assignee_id != null ? Number(args.assignee_id) : undefined;
            let assigneeName: string | undefined;

            if (assigneeId == null && args.assignee_name) {
                const q = String(args.assignee_name).trim();
                try {
                    const dir = await java.directory(ctx.authorization);
                    const matched = dir.find((u) => {
                        const rn = String(u.realName ?? "");
                        const un = String(u.username ?? "");
                        return rn.includes(q) || un.includes(q);
                    });
                    if (matched) {
                        assigneeId = Number(matched.id);
                        assigneeName = String(matched.realName || matched.username);
                    }
                } catch {
                    // ignore directory lookup error
                }
            }

            const dueDate =
                typeof args.due_date === "string" && args.due_date.match(/^\d{4}-\d{2}-\d{2}$/)
                    ? args.due_date
                    : undefined;

            try {
                await java.createTask(
                    projectId,
                    {
                        title,
                        description: args.description ? String(args.description) : undefined,
                        assigneeId,
                        dueDate,
                    },
                    ctx.authorization,
                );
                return new ToolOutcome(
                    `已在「${projectName}」中创建任务「${title}」${assigneeName ? ` (指派给 ${assigneeName})` : ""}`,
                    {
                        success: true,
                        task: { title, project: projectName, assignee: assigneeName, due: dueDate },
                    },
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return new ToolOutcome("创建任务失败", { error: message }, [], false);
            }
        },
        true,
    );

    tool(
        "update_task_status",
        "更新任务状态为「待开始」、「进行中」或「已完成」。用户指令如「把“修复登录bug”任务标记为已完成」时使用。",
        {
            type: "object",
            properties: {
                task_id: { type: "integer", description: "任务ID，若已知可直接传入" },
                task_title: { type: "string", description: "任务标题或关键字，用于自动查找任务" },
                status: {
                    type: "string",
                    enum: ["待开始", "进行中", "已完成"],
                    description: "目标状态",
                },
            },
            required: ["status"],
        },
        async (ctx: ToolContext, args) => {
            const statusStr = String(args.status ?? "");
            const statusMap: Record<string, number> = { "待开始": 0, "进行中": 1, "已完成": 2 };
            if (!(statusStr in statusMap)) {
                return new ToolOutcome(
                    "更新失败",
                    { error: "状态必须是「待开始」、「进行中」或「已完成」" },
                    [],
                    false,
                );
            }
            const statusCode = statusMap[statusStr];

            let targetTaskId: number | undefined =
                args.task_id != null ? Number(args.task_id) : undefined;
            let targetTitle = args.task_title ? String(args.task_title).trim() : undefined;

            if (targetTaskId == null && targetTitle) {
                const tasks = await java.myTasks(ctx.authorization);
                const q = targetTitle.toLowerCase();
                const matched = tasks.find((t) => String(t.title ?? "").toLowerCase().includes(q));
                if (matched) {
                    targetTaskId = Number(matched.id);
                    targetTitle = String(matched.title);
                }
            }

            if (targetTaskId == null) {
                return new ToolOutcome(
                    "未找到指定任务",
                    { error: "请提供准确的任务ID或任务标题关键字" },
                    [],
                    false,
                );
            }

            try {
                await java.updateTaskStatus(targetTaskId, statusCode, ctx.authorization);
                return new ToolOutcome(
                    `已将任务「${targetTitle ?? targetTaskId}」状态更新为「${statusStr}」`,
                    { success: true, taskId: targetTaskId, status: statusStr },
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return new ToolOutcome("更新任务状态失败", { error: message }, [], false);
            }
        },
        true,
    );
}
