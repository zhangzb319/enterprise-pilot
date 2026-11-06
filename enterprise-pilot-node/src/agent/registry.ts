/** 工具注册表。

每个工具声明「名称 + 描述 + JSON Schema + 处理函数」,运行时由 specs() 生成
GLM 的 tools 参数,由 execute() 统一调度。对应 Python 版的 app/agent/registry.py。

约定:
- 处理函数第一参数固定是 ToolContext,其余参数与 schema 中的 properties 一致,
  由各工具自行从 arguments 里取值(schema 即文档,模型产参不可信,全部需容错)。
- 返回 ToolOutcome:summary 给前端时间线展示,payload 回灌给模型。
- 工具内部异常不向上抛,转成 error payload,让模型自己向用户解释。
 */

import { AppError } from "../errors.js";

export type ToolContext = {
    /** 透传给 Java 后端做鉴权的 Authorization 头。 */
    authorization: string | null;
};

export type ToolSource = { document_id: string; title: string };

export class ToolOutcome {
    constructor(
        readonly summary: string,
        readonly payload: unknown,
        readonly sources: ToolSource[] = [],
        /** false 表示工具本身不可用(网络/鉴权/依赖故障),调用方据此禁止模型用常识兜底。 */
        readonly ok: boolean = true,
    ) {}

    asToolMessage(): string {
        return JSON.stringify(this.payload);
    }
}

export type Tool = {
    name: string;
    description: string;
    parameters: object;
    write: boolean;
    handler: (ctx: ToolContext, args: Record<string, unknown>) => Promise<ToolOutcome>;
};

const REGISTRY = new Map<string, Tool>();

const EMPTY_SCHEMA = { type: "object", properties: {}, required: [] };

export function tool(
    name: string,
    description: string,
    parameters: object = EMPTY_SCHEMA,
    handler: Tool["handler"],
    write = false,
): void {
    REGISTRY.set(name, { name, description, parameters, handler, write });
}

export type ToolSpec = {
    type: "function";
    function: { name: string; description: string; parameters: object };
};

export function specs(): ToolSpec[] {
    return [...REGISTRY.values()].map((item) => ({
        type: "function" as const,
        function: { name: item.name, description: item.description, parameters: item.parameters },
    }));
}

export function names(): string[] {
    return [...REGISTRY.keys()];
}

/** 测试专用:摘除用例注册的工具,避免全局注册表跨用例泄漏。生产代码不要调用。 */
export function unregisterForTests(name: string): void {
    REGISTRY.delete(name);
}

export function isWrite(name: string): boolean {
    return REGISTRY.get(name)?.write ?? false;
}

export async function execute(name: string, args: unknown, ctx: ToolContext): Promise<ToolOutcome> {
    const item = REGISTRY.get(name);
    if (!item) {
        return new ToolOutcome(
            `未知工具 ${name}`,
            { error: `unknown tool: ${name}`, hint: "该能力不存在,请如实告知用户,不要编造" },
            [],
            false,
        );
    }
    const arguments_ = (args ?? {}) as Record<string, unknown>;
    try {
        return await item.handler(ctx, arguments_);
    } catch (error) {
        // 关键:必须明确禁止模型在拿不到数据时用常识兜底,否则会编造公司制度类答案
        const message = error instanceof Error ? error.message : String(error);
        const status = error instanceof AppError ? error.status : undefined;
        return new ToolOutcome(
            status === 401 || status === 403 ? "无权访问该数据" : "工具执行失败",
            {
                error: message.slice(0, 300),
                hint: "该工具暂时不可用。请如实告知用户现在查不到数据,绝对不要凭常识或记忆编造答案。",
            },
            [],
            false,
        );
    }
}
