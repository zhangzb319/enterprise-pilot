"""Agent 主循环:规划轮(带工具) → 并行执行 → 合成轮(流式)。

为什么是两段式:
实测 GLM 在 stream=True 时会忽略 tools、直接返回正文,因此无法在流式调用里拿到
tool_calls。必须先用非流式调用做工具决策,再用流式调用生成最终答案。
"""

import asyncio
import json
from dataclasses import dataclass
from datetime import datetime

from app.agent import registry
from app.agent.registry import ToolContext
from app.clients.llm_client import LlmClient

# 6 个工具都是相互独立的只读查询,模型可在一轮内并行调用完。
# 若调到 2 轮以上,第二轮通常会直接产出正文,答案将退化为非流式返回。
MAX_TOOL_ROUNDS = 1
MAX_HISTORY = 10

_WEEKDAYS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]


def _system_prompt() -> str:
    now = datetime.now()
    today = f"{now.strftime('%Y-%m-%d')} {_WEEKDAYS[now.weekday()]}"
    return f"""你是 Enterprise Pilot 企业办公平台的智能助手,用中文简洁作答。今天是 {today}。

工具使用规则:
1. 涉及用户的个人事实(会议、项目、任务、同事)以及公司制度、流程、内部资料的问题,必须先调用工具获取事实,禁止凭记忆或常识编造。
2. 多个不相关的查询可以一次性并行发起多个工具调用。
3. 工具返回为空或报错时,如实说明查不到,并提示用户稍后重试。公司制度、政策、流程类问题一旦没有检索结果,绝不能凭常识编造。
4. 回答中用自然语言转述工具结果,不要暴露工具名、参数或原始 JSON。
5. 与办公无关的闲聊直接回答,无需调用工具。
6. 需要日期区间时,以今天为基准计算。"""


@dataclass(slots=True)
class AgentEvent:
    kind: str  # step / sources / delta
    data: dict


def _parse_arguments(call: dict) -> dict:
    raw = (call.get("function") or {}).get("arguments") or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _history_messages(history: list[dict] | None) -> list[dict]:
    messages = []
    for item in (history or [])[-MAX_HISTORY:]:
        role, content = item.get("role"), item.get("content")
        if role in ("user", "assistant") and isinstance(content, str) and content.strip():
            messages.append({"role": role, "content": content})
    return messages


async def stream(message: str, authorization: str | None = None, history: list[dict] | None = None):
    llm = LlmClient()
    ctx = ToolContext(authorization)
    messages = [{"role": "system", "content": _system_prompt()}]
    messages.extend(_history_messages(history))
    messages.append({"role": "user", "content": message})

    collected_sources: dict[str, dict] = {}

    for _ in range(MAX_TOOL_ROUNDS):
        reply, _usage = await llm.chat_with_tools(messages, registry.specs())
        calls = reply.get("tool_calls") or []

        if not calls:
            # 无需工具,规划轮产出的就是最终答案,省掉一次调用
            text = reply.get("content") or ""
            if text:
                yield AgentEvent("delta", {"text": text})
            return

        messages.append({"role": "assistant", "content": reply.get("content") or "", "tool_calls": calls})

        for call in calls:
            yield AgentEvent("step", {"tool": (call.get("function") or {}).get("name", ""), "status": "running"})

        outcomes = await asyncio.gather(
            *[
                registry.execute(
                    (call.get("function") or {}).get("name", ""),
                    _parse_arguments(call),
                    ctx,
                )
                for call in calls
            ]
        )

        for call, outcome in zip(calls, outcomes):
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.get("id"),
                    "content": outcome.as_tool_message(),
                }
            )
            yield AgentEvent(
                "step",
                {
                    "tool": (call.get("function") or {}).get("name", ""),
                    "status": "done",
                    "summary": outcome.summary,
                },
            )
            for source in outcome.sources:
                collected_sources.setdefault(source["document_id"], source)

        # 所有工具都不可用时,模型只会拿常识硬编(实测 glm-4-flash 会忽略提示词约束),
        # 这里直接给出确定性回答,不让它生成。
        if not any(outcome.ok for outcome in outcomes):
            yield AgentEvent("delta", {"text": "抱歉,查询服务暂时不可用,这次没能拿到数据。请稍后重试,或直接联系管理员。"})
            return

    if collected_sources:
        yield AgentEvent("sources", {"items": list(collected_sources.values())})

    # 合成轮:去掉 tools 才能真正流式输出
    emitted = False
    async for delta in llm.chat_stream(messages):
        emitted = True
        yield AgentEvent("delta", {"text": delta})

    if not emitted:
        yield AgentEvent("delta", {"text": "抱歉,这次没有生成有效回复,请换个问法再试一次。"})
