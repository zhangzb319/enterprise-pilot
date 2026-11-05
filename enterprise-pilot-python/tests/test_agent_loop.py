"""Agent 循环的行为测试:用假 LLM 覆盖三条关键路径,不触网。"""

import asyncio
import json

from app.agent import loop, registry
from app.agent.registry import ToolOutcome


class FakeLlm:
    """按预设脚本返回:第一次 chat_with_tools 给工具调用,之后给正文。"""

    def __init__(self, first_reply: dict, stream_chunks: list[str] | None = None) -> None:
        self.first_reply = first_reply
        self.stream_chunks = stream_chunks or []
        self.tool_calls = 0
        self.stream_calls = 0
        self.seen_messages: list[list[dict]] = []

    async def chat_with_tools(self, messages, tools, temperature=0.2):
        self.tool_calls += 1
        self.seen_messages.append(list(messages))
        return self.first_reply, {"prompt_tokens": 10, "completion_tokens": 5}

    async def chat_stream(self, messages, temperature=0.2):
        self.stream_calls += 1
        for chunk in self.stream_chunks:
            yield chunk


def _collect(coro) -> list:
    async def run():
        return [event async for event in coro]

    return asyncio.run(run())


def test_no_tool_call_returns_content_directly(monkeypatch) -> None:
    fake = FakeLlm({"content": "你好,有什么可以帮你?", "tool_calls": None})
    monkeypatch.setattr(loop, "LlmClient", lambda: fake)

    events = _collect(loop.stream("你好"))

    assert [event.kind for event in events] == ["delta"]
    assert events[0].data["text"] == "你好,有什么可以帮你?"
    # 无需工具时不应再发起第二次生成
    assert fake.stream_calls == 0


def test_tool_call_emits_steps_then_streams_answer(monkeypatch) -> None:
    fake = FakeLlm(
        {
            "content": None,
            "tool_calls": [
                {"id": "call_1", "type": "function", "function": {"name": "list_my_tasks", "arguments": "{}"}}
            ],
        },
        stream_chunks=["你有", "两个任务"],
    )

    async def fake_execute(name, arguments, ctx):
        return ToolOutcome(summary="查到 2 个任务", payload={"tasks": ["A", "B"]})

    monkeypatch.setattr(loop, "LlmClient", lambda: fake)
    monkeypatch.setattr(registry, "execute", fake_execute)

    events = _collect(loop.stream("我的任务"))

    kinds = [event.kind for event in events]
    assert kinds == ["step", "step", "delta", "delta"]
    assert events[0].data == {"tool": "list_my_tasks", "status": "running"}
    assert events[1].data["status"] == "done"
    assert events[1].data["summary"] == "查到 2 个任务"
    assert "".join(event.data["text"] for event in events if event.kind == "delta") == "你有两个任务"
    # 工具结果必须以 role=tool 回灌给模型
    tool_messages = [m for m in fake.seen_messages[0] if m["role"] == "user"]
    assert tool_messages


def test_tool_result_is_fed_back_with_call_id(monkeypatch) -> None:
    fake = FakeLlm(
        {
            "content": None,
            "tool_calls": [
                {"id": "call_x", "type": "function", "function": {"name": "list_my_tasks", "arguments": "{}"}}
            ],
        },
        stream_chunks=["好的"],
    )
    captured: dict = {}

    async def fake_execute(name, arguments, ctx):
        return ToolOutcome(summary="ok", payload={"tasks": []})

    original_chat_stream = fake.chat_stream

    async def spy_chat_stream(messages, temperature=0.2):
        captured["messages"] = messages
        async for chunk in original_chat_stream(messages):
            yield chunk

    monkeypatch.setattr(loop, "LlmClient", lambda: fake)
    monkeypatch.setattr(registry, "execute", fake_execute)
    monkeypatch.setattr(fake, "chat_stream", spy_chat_stream)

    _collect(loop.stream("我的任务"))

    messages = captured["messages"]
    assistant = next(m for m in messages if m["role"] == "assistant")
    tool_msg = next(m for m in messages if m["role"] == "tool")
    assert assistant["tool_calls"][0]["id"] == "call_x"
    assert tool_msg["tool_call_id"] == "call_x"
    assert json.loads(tool_msg["content"]) == {"tasks": []}


def test_all_tools_failed_skips_model_answer(monkeypatch) -> None:
    """工具全挂时不能交给模型,否则 glm-4-flash 会用常识编造公司制度类答案。"""
    fake = FakeLlm(
        {
            "content": None,
            "tool_calls": [{"id": "c1", "type": "function", "function": {"name": "no_such_tool", "arguments": "{}"}}],
        },
        stream_chunks=["这段不该出现"],
    )
    monkeypatch.setattr(loop, "LlmClient", lambda: fake)

    events = _collect(loop.stream("随便问问"))

    done = [event for event in events if event.kind == "step" and event.data["status"] == "done"]
    assert done[0].data["summary"] == "未知工具 no_such_tool"
    assert fake.stream_calls == 0
    assert events[-1].kind == "delta"
    assert "暂时不可用" in events[-1].data["text"]


def test_sources_are_emitted_and_deduplicated(monkeypatch) -> None:
    fake = FakeLlm(
        {
            "content": None,
            "tool_calls": [
                {"id": "c1", "type": "function", "function": {"name": "search_knowledge", "arguments": '{"question":"年假"}'}}
            ],
        },
        stream_chunks=["根据制度"],
    )

    async def fake_execute(name, arguments, ctx):
        return ToolOutcome(
            summary="命中 2 条资料",
            payload={"results": []},
            sources=[
                {"document_id": "doc-1", "title": "员工手册"},
                {"document_id": "doc-1", "title": "员工手册"},
                {"document_id": "doc-2", "title": "考勤制度"},
            ],
        )

    monkeypatch.setattr(loop, "LlmClient", lambda: fake)
    monkeypatch.setattr(registry, "execute", fake_execute)

    events = _collect(loop.stream("年假怎么休"))

    source_events = [event for event in events if event.kind == "sources"]
    assert len(source_events) == 1
    assert [item["document_id"] for item in source_events[0].data["items"]] == ["doc-1", "doc-2"]


def test_registry_drops_unknown_arguments() -> None:
    captured: dict = {}

    @registry.tool("echo_tool", "测试用工具", {"type": "object", "properties": {"text": {"type": "string"}}})
    async def echo(ctx, text: str = "default") -> ToolOutcome:
        captured["text"] = text
        return ToolOutcome(summary="ok", payload={"text": text})

    async def run():
        return await registry.execute("echo_tool", {"text": "hi", "unexpected": 1}, registry.ToolContext())

    try:
        outcome = asyncio.run(run())
    finally:
        # 注册表是全局的,测试结束必须摘掉,否则会污染其他用例的 tools 列表
        registry._REGISTRY.pop("echo_tool", None)

    assert captured["text"] == "hi"
    assert outcome.payload == {"text": "hi"}
