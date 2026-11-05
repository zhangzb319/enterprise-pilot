"""工具注册表。

每个工具用 @tool 声明「名称 + 描述 + JSON Schema + 处理函数」，
运行时由 specs() 生成 GLM 的 tools 参数，由 execute() 统一调度。

约定：
- 处理函数第一个参数固定是 ToolContext，其余参数名与 schema 中的 properties 一致。
- 返回 ToolOutcome：summary 给前端时间线展示，payload 回灌给模型。
- 工具内部异常不向上抛，转成 error payload，让模型自己向用户解释。
"""

import inspect
import json
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable


@dataclass(slots=True)
class ToolContext:
    """一次对话内共享的调用上下文。authorization 透传给 Java 后端做鉴权。"""

    authorization: str | None = None


@dataclass(slots=True)
class ToolOutcome:
    summary: str
    payload: Any
    sources: list[dict] = field(default_factory=list)
    # False 表示工具本身不可用(网络/鉴权/依赖故障),调用方据此禁止模型用常识兜底
    ok: bool = True

    def as_tool_message(self) -> str:
        return json.dumps(self.payload, ensure_ascii=False, default=str)


@dataclass(slots=True)
class Tool:
    name: str
    description: str
    parameters: dict
    handler: Callable[..., Awaitable[ToolOutcome]]
    write: bool = False


_REGISTRY: dict[str, Tool] = {}

_EMPTY_SCHEMA = {"type": "object", "properties": {}, "required": []}


def tool(name: str, description: str, parameters: dict | None = None, write: bool = False):
    """注册一个工具。write=True 表示有副作用，需上层做二次确认后才可执行。"""

    def decorate(handler: Callable[..., Awaitable[ToolOutcome]]):
        _REGISTRY[name] = Tool(name, description, parameters or _EMPTY_SCHEMA, handler, write)
        return handler

    return decorate


def specs() -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": item.name,
                "description": item.description,
                "parameters": item.parameters,
            },
        }
        for item in _REGISTRY.values()
    ]


def names() -> list[str]:
    return list(_REGISTRY.keys())


def is_write(name: str) -> bool:
    item = _REGISTRY.get(name)
    return bool(item and item.write)


async def execute(name: str, arguments: dict | None, ctx: ToolContext) -> ToolOutcome:
    item = _REGISTRY.get(name)
    if item is None:
        return ToolOutcome(
            summary=f"未知工具 {name}",
            payload={"error": f"unknown tool: {name}", "hint": "该能力不存在,请如实告知用户,不要编造"},
            ok=False,
        )

    accepted = set(inspect.signature(item.handler).parameters) - {"ctx"}
    # 模型偶尔会多传或漏传参数，这里只保留签名内允许的键，缺省值交给函数默认参数
    kwargs = {key: value for key, value in (arguments or {}).items() if key in accepted}
    try:
        return await item.handler(ctx, **kwargs)
    except TypeError as exc:
        return ToolOutcome(
            summary="工具参数不合法",
            payload={"error": f"bad arguments: {exc}", "hint": "请调整参数后重试,或告知用户无法完成"},
            ok=False,
        )
    except Exception as exc:  # noqa: BLE001 - 工具失败必须降级为可解释的结果
        # 关键:必须明确禁止模型在拿不到数据时用常识兜底,否则会编造公司制度类答案
        return ToolOutcome(
            summary="工具执行失败",
            payload={
                "error": str(exc)[:300],
                "hint": "该工具暂时不可用。请如实告知用户现在查不到数据,绝对不要凭常识或记忆编造答案。",
            },
            ok=False,
        )
