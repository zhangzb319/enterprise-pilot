"""Agent 工具集。

导入即完成注册;新增工具模块后在此追加一行 import 即可被模型看到。
"""

from app.agent.tools import knowledge, meetings, people, projects  # noqa: F401
