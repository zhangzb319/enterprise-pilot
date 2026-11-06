/** Agent 循环的行为测试:用假 LLM + 注册表内假工具覆盖关键路径,不触网。
 *  对应 Python 版 test_agent_loop.py。 */

import { afterEach, describe, expect, it } from "vitest";
import * as loop from "../src/agent/loop.js";
import { execute, tool, ToolOutcome, unregisterForTests } from "../src/agent/registry.js";
import type { ChatMessage, ToolCall, ToolSpec, Usage } from "../src/clients/llmClient.js";

type FakeReply = { content: string | null; tool_calls: ToolCall[] | null };

class FakeLlm {
    toolCalls = 0;
    streamCalls = 0;
    seenMessages: ChatMessage[][] = [];

    constructor(
        private readonly firstReply: FakeReply,
        private readonly streamChunks: string[] = [],
    ) {}

    async chatWithTools(
        messages: ChatMessage[],
        _tools: ToolSpec[],
        _temperature = 0.2,
    ): Promise<{ message: FakeReply; usage: Usage }> {
        this.toolCalls += 1;
        this.seenMessages.push(messages.map((m) => ({ ...m })));
        return { message: this.firstReply, usage: { prompt_tokens: 10, completion_tokens: 5 } };
    }

    async *chatStream(messages: ChatMessage[], _temperature = 0.2): AsyncGenerator<string> {
        this.streamCalls += 1;
        // 合成轮的入参里应已包含 assistant(tool_calls)与 role=tool 的回灌消息
        this.streamSeen = messages.map((m) => ({ ...m }));
        for (const chunk of this.streamChunks) yield chunk;
    }

    streamSeen: ChatMessage[] = [];
}

async function collect(generator: AsyncGenerator<loop.AgentEvent>): Promise<loop.AgentEvent[]> {
    const events: loop.AgentEvent[] = [];
    for await (const event of generator) events.push(event);
    return events;
}

function call(id: string, name: string, args = "{}"): ToolCall {
    return { id, type: "function", function: { name, arguments: args } };
}

/** 注册一次性测试工具,用例结束后摘掉,避免污染其他用例的 tools 列表。 */
const registered: string[] = [];
function withTool(name: string, handler: Parameters<typeof tool>[3]): void {
    tool(name, "测试用工具", { type: "object", properties: {}, required: [] }, handler);
    registered.push(name);
}
afterEach(() => {
    for (const name of registered.splice(0)) {
        unregisterForTests(name);
    }
});

describe("agent loop", () => {
    it("无工具调用时规划轮直接产出答案,不再发起第二次生成", async () => {
        const fake = new FakeLlm({ content: "你好,有什么可以帮你?", tool_calls: null });
        const restore = loop.setLlmFactory(() => fake as never);

        const events = await collect(loop.stream("你好"));

        restore();
        expect(events).toEqual([{ kind: "delta", data: { text: "你好,有什么可以帮你?" } }]);
        expect(fake.streamCalls).toBe(0);
    });

    it("有工具调用时先发 step 再流式合成答案", async () => {
        withTool("list_my_tasks", async () =>
            new ToolOutcome("查到 1 个任务", { tasks: [{ title: "写周报" }] }),
        );
        const fake = new FakeLlm(
            { content: null, tool_calls: [call("call_1", "list_my_tasks")] },
            ["你有", "两个任务"],
        );
        const restore = loop.setLlmFactory(() => fake as never);

        const events = await collect(loop.stream("我的任务"));

        restore();
        expect(events.map((event) => event.kind)).toEqual(["step", "step", "delta", "delta"]);
        expect(events[0].data).toEqual({ tool: "list_my_tasks", status: "running" });
        expect(events[1].data).toMatchObject({ tool: "list_my_tasks", status: "done", summary: "查到 1 个任务" });
        expect(events[2].data).toEqual({ text: "你有" });
    });

    it("工具结果以 role=tool + tool_call_id 回灌给模型", async () => {
        withTool("list_my_tasks", async () => new ToolOutcome("查到 1 个任务", { tasks: [] }));
        const fake = new FakeLlm(
            { content: null, tool_calls: [call("call_9", "list_my_tasks", '{"only_mine": true}')] },
            ["done"],
        );
        const restore = loop.setLlmFactory(() => fake as never);

        await collect(loop.stream("我的任务"));

        restore();
        const sent = fake.streamSeen;
        const assistant = sent.find((m) => m.role === "assistant")!;
        const toolMessage = sent.find((m) => m.role === "tool")!;
        expect(assistant.tool_calls?.[0]?.id).toBe("call_9");
        expect(toolMessage.tool_call_id).toBe("call_9");
        expect(JSON.parse(toolMessage.content)).toEqual({ tasks: [] });
    });

    it("所有工具失败时返回确定性兜底文案,不再让模型生成", async () => {
        withTool("list_my_tasks", async () => {
            throw new Error("boom");
        });
        const fake = new FakeLlm(
            { content: null, tool_calls: [call("call_1", "list_my_tasks")] },
            ["不应被消费"],
        );
        const restore = loop.setLlmFactory(() => fake as never);

        const events = await collect(loop.stream("我的任务"));

        restore();
        expect(events.at(-1)).toEqual({
            kind: "delta",
            data: { text: "抱歉,查询服务暂时不可用,这次没能拿到数据。请稍后重试,或直接联系管理员。" },
        });
        expect(fake.streamCalls).toBe(0);
    });

    it("sources 按 document_id 去重后发出", async () => {
        withTool("search_knowledge", async () =>
            new ToolOutcome("命中 2 条资料", { results: [] }, [
                { document_id: "doc-1", title: "员工手册" },
                { document_id: "doc-2", title: "考勤制度" },
                { document_id: "doc-1", title: "员工手册" },
            ]),
        );
        const fake = new FakeLlm(
            { content: null, tool_calls: [call("call_1", "search_knowledge", '{"question": "年假"}')] },
            ["依据公司制度..."],
        );
        const restore = loop.setLlmFactory(() => fake as never);

        const events = await collect(loop.stream("年假怎么休"));

        restore();
        const sourceEvents = events.filter((event) => event.kind === "sources");
        expect(sourceEvents).toHaveLength(1);
        const items = (sourceEvents[0].data as { items: { document_id: string }[] }).items;
        expect(items.map((item) => item.document_id)).toEqual(["doc-1", "doc-2"]);
    });
});

describe("registry execute", () => {
    it("未知工具降级为 error payload,ok=false", async () => {
        const outcome = await execute("nope", {}, { authorization: null });
        expect(outcome.ok).toBe(false);
        expect(outcome.summary).toContain("未知工具");
    });

    it("工具抛错时降级为 error payload,ok=false,禁止模型兜底", async () => {
        withTool("boom_tool", async () => {
            throw new Error("backend down");
        });
        const outcome = await execute("boom_tool", {}, { authorization: null });
        expect(outcome.ok).toBe(false);
        expect(JSON.parse(outcome.asToolMessage()).hint).toContain("不要凭常识");
    });
});
