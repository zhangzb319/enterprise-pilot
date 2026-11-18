# Enterprise Pilot 企业智能办公平台

集项目管理、会议管理、知识库、AI 助手、消息与通知于一体的企业办公平台,采用 **Web 前端 + Java 业务后端 + Node Agent 调度 + Python RAG 服务** 的四端协同架构。

---

## 架构

```
+------------------+  /api  +------------------+          +------------------+
|  enterprise-     | -----> |  enterprise-     |          |  enterprise-     |
|  pilot-web       |  /py   |  pilot-java      |          |  pilot-python    |
|  React 19 + Vite | -----> |  Spring Boot 4   |          |  FastAPI         |
|  Tailwind CSS v4 |  :5173 |  :8080           |          |  RAG/文档:8001   |
|                  |        |PostgreSQL + Redis|          |  Chroma + 智谱   |
+--------+---------+        +--------+---------+          +--------+---------+
         |                           ^       ^                   ^
         | /ai (代理到 8002)          |       |  带 JWT 回调取数    | 检索
         v                           |       |                   |
+------------------+                 |       +-------------------+
|  enterprise-     |   带 JWT 回调 ----+       (search_knowledge 工具
|  pilot-node      |   Java 取数              走 /rag/retrieve)
|  Agent(TS):8002  |   执行行动操作
|  Fastify + tsx   |   (建任务/订会议/改状态)
+------------------+
```

前端开发服务器通过 Vite 代理把 `/api` 转发到 Java 后端、`/api/v1/agent` 转发到 Node Agent 服务、`/api/v1/rag` 与 `/api/v1/meetings` 转发到 Python RAG 服务,浏览器侧无需处理跨域。

- **Web 前端**(:5173): React 19 + TypeScript + Tailwind CSS v4 单页应用,负责现代化页面渲染与用户交互
- **Java 后端**(:8080): Spring Boot 业务服务,负责认证授权、业务逻辑与数据持久化
- **Node Agent 服务**(:8002): Fastify + TypeScript,负责 AI 助手的工具循环与流式作答;内置 10 个协同工具(支持只读查询与自然语言预订、创建任务、更新状态等行动操作);带用户 JWT 回调 Java 取数、调 Python 检索知识库
- **Python AI 服务**(:8001): FastAPI,专注 RAG 上游文档处理(上传/分块/embedding/向量检索)与会议音频转写/结构化纪要提炼

> 四个服务平级。Java 不反向调用任何服务;Node Agent 在执行工具时带着用户 JWT 回调 Java 接口(权限判断与项目鉴权全在 Java 侧),知识库检索则转发给 Python。Python 只做 RAG 与纪要提炼上游。

---

## 技术栈

| 模块 | 技术 | 版本 |
|------|------|------|
| 后端 | Java + Spring Boot + MyBatis-Plus | 17 / 4.0.7 / 3.5.15 |
| Agent 服务 | Node + Fastify + TypeScript + Zod | 18+ / 5.2 / 5.7 / 3.24 |
| AI 服务 | Python + FastAPI + ChromaDB | 3.11+ / 0.115+ / 0.5+ |
| 前端 | React 19 + TypeScript + Tailwind CSS + Lucide + Vite | 19.0 / 5.7 / 4.3 / 8.3 |
| 数据库 | PostgreSQL | 14+ |
| 缓存 | Redis | 7.x |
| LLM | APInex `free/hy4`(Agent)+ 智谱 `embedding-2`(RAG) | — |

---

## 环境要求

- Java 17+ 与 Maven 3.8+(也可用仓库自带的 `mvnw`)
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+(本地安装或 Docker 容器均可)
- Redis 7(可选,`start.bat` 会尝试自动拉起;找不到时 Java 端缓存会降级)

---

## 快速启动

### 方式一:一键脚本(推荐,Windows)

```bat
start.bat
```

脚本会自动完成:检查 Redis → 从模板生成 `.env` → 校验必需变量 → 建 Python 虚拟环境并装依赖 → 依次拉起 Java、Python、前端 → 打开浏览器。

| 命令 | 作用 |
|------|------|
| `start.bat` | 启动全部服务并打开浏览器 |
| `start.bat nobrowser` | 启动全部服务,不开浏览器 |
| `start.bat stop` | 停止全部服务(按端口 6379 / 8080 / 8001 / 5173 结束进程) |
| `start.bat help` | 显示帮助 |

> **首次运行前必须先配置 `.env`**。脚本在变量仍为占位值(`your-` / `replace-with` / `changeme` / `example`)时会直接报错退出。

### 方式二:手动启动

1. **配置环境变量**——在 `enterprise-pilot-java/` 与 `enterprise-pilot-python/` 下**各自**创建 `.env`:

   ```bash
   copy enterprise-pilot-java\.env.example   enterprise-pilot-java\.env
   copy enterprise-pilot-python\.env.example enterprise-pilot-python\.env
   ```

   ⚠️ 两个子项目的 `.env.example` **内容不同,不能互相拷贝**:
   - `enterprise-pilot-java/.env.example` → 只含 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD`、`JWT_SECRET`(经 `start.bat` 注入为进程环境变量,由 `application.yml` 的 `${...}` 读取)
   - `enterprise-pilot-python/.env.example` → `ZHIPU_API_KEY`、`ZHIPU_BASE_URL`、`ZHIPU_CHAT_MODEL`、`ZHIPU_EMBEDDING_MODEL`、`ASR_ENDPOINT`、`JAVA_BACKEND_URL`、`CHROMA_PERSIST_DIR`(由 `pydantic-settings` 直接从 `.env` 文件加载)

2. **初始化数据库**(建表):

   ```bash
   psql -U postgres -c "CREATE DATABASE \"enterprise-pilot\" ENCODING 'UTF8';"
   psql -U postgres -d enterprise-pilot -f sql/schema_postgres.sql
   ```

   演示数据可用 `sql/seed_data.sql`(MySQL 语法,需手工改写)或直接从旧库迁移。

3. **分别启动三个服务**:

   ```bash
   # Java 后端
   cd enterprise-pilot-java && mvnw spring-boot:run

   # Python AI 服务(先建虚拟环境并安装依赖)
   cd enterprise-pilot-python
   python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
   .venv\Scripts\python -m uvicorn app.main:app --port 8001

   # 前端
   cd enterprise-pilot-web && npm install && npm run dev
   ```

> **注意**:手工启动 Java 时 `.env` **不会自动生效**——需要自己把其中变量导出为环境变量。一键脚本 `start.bat` 已内置该逻辑,日常开发建议直接用脚本。

### 方式三:Docker

⚠️ **当前不可用**。`docker-compose.yml` 为 `java-backend`、`python-ai`、`web` 三个服务声明了构建上下文,但:

- `enterprise-pilot-java/Dockerfile` —— 缺失
- `enterprise-pilot-web/Dockerfile` —— 缺失
- `enterprise-pilot-python/Dockerfile` —— 是一个 **0 字节的空目录**,并非文件

补全这三个文件后 `docker-compose up -d --build` 才能工作。MySQL 首次启动会自动执行 `sql/schema.sql` 初始化表结构(注意:docker-compose 编排的是 MySQL,与当前单机部署用的 PostgreSQL 不同步,使用前需改造)。

---

## 项目结构

```
enterprise-pilot/
├── enterprise-pilot-java/     # Spring Boot 后端
│   └── src/main/java/com/zhang/enterprisepilotjava/
│       ├── common/            # 统一响应 Result、全局异常、JWT 过滤器、Redis 封装
│       ├── config/            # Security、Jackson、MyBatis-Plus 等配置
│       ├── user/              # 用户:注册登录、资料、密码、角色
│       ├── department/        # 部门树与增删改
│       ├── project/           # 项目、成员、任务(支持状态直改)、讨论(含 ProjectAuthorizationService)
│       ├── meeting/           # 会议室、会议预订、会议纪要(MeetingSummary)与待办(MeetingTodo)
│       ├── message/           # 站内消息
│       └── notification/      # 通知
├── enterprise-pilot-python/   # FastAPI AI 服务
│   └── app/
│       ├── api/v1/            # 路由:rag、meeting(结构化纪要与待办提取)
│       ├── services/          # rag_service、agent_service、meeting_service
│       ├── clients/           # llm_client(智谱)、java_client(回调 Java)、asr_client
│       ├── vector_store/      # chroma_client 向量库封装
│       ├── schemas/           # Pydantic 出入参(含 ActionItem)
│       └── core/              # 配置、日志、异常
├── enterprise-pilot-node/     # Node Agent 服务(Fastify + TS)
│   └── src/
│       ├── agent/             # registry(工具注册表)、loop(两段式循环)、tools(10 个工具:6只读 + 4行动)
│       ├── clients/           # llmClient(APInex/智谱)、javaClient(回调 Java 增删改查)、ragClient(调 Python)
│       ├── routes/            # SSE 流式对话路由
│       └── services/          # agent_service(qa_log 审计上报)
├── enterprise-pilot-web/      # React 19 前端 (Tailwind CSS v4 + Vite)
│   └── src/
│       ├── views/             # 11 个页面:登录、工作台、项目、会议、知识库、
│       │                      #   AI 助手、消息、通讯录、个人资料、系统管理、帮助
│       ├── context/           # AppContext 核心状态流(认证/多会话/折叠栏)
│       ├── services/          # apiClient 接口与 SSE 流式封装
│       ├── components/        # AppShell、Agent 交互面板、Markdown 渲染等
│       └── lib/               # 工具函数与时间轴计算
├── sql/                       # schema_postgres.sql 建表(PG,当前使用)+ schema.sql(旧 MySQL 版)
│                              #   + seed_data.sql 演示数据 + migration_*.sql 增量脚本
├── docs/README.md             # API 端点清单 + 表结构概览 + 部署说明
├── start.bat / stop.bat       # Windows 一键启动 / 停止
├── docker-compose.yml         # 容器化编排(需先补 Dockerfile)
├── PROJECT_AUDIT.md           # 项目梳理报告与待办 findings
└── runtime-logs/              # 运行时日志输出目录
```

---

## 端口与接口

| 服务 | 端口 | 说明 |
|------|------|------|
| Web 前端 | 5173 | Vite 开发服务器 |
| Java 后端 | 8080 | REST API,前缀 `/api`,受 JWT 保护 |
| Node Agent 服务 | 8002 | 前缀 `/api/v1/agent`,Agent 对话(SSE) |
| Python AI 服务 | 8001 | 前缀 `/api/v1`,RAG 与会议纪要,自带 Swagger UI(`/docs`) |
| PostgreSQL | 5432 | 数据库 `enterprise-pilot`(Docker 容器 `my-postgres`) |
| Redis | 6379 | 缓存(项目成员、我的项目列表、JWT 黑名单) |

完整端点清单与 20 张表的结构概览见 [docs/README.md](docs/README.md)。

---

## 功能状态

诚实标注当前实现程度,避免按图索骥时踩空。

| 模块 | 状态 | 说明 |
|------|------|------|
| 用户 / 认证 | ✅ 可用 | 注册、登录、JWT、登出黑名单、资料与密码修改 |
| 部门 | ✅ 可用 | 部门树 + 管理员增删改 |
| 项目 | ✅ 可用 | 项目、成员、任务(支持表格内即时状态切换)、讨论树;`ProjectTaskServiceImpl` / `ProjectDiscussionServiceImpl` 已接入成员鉴权 |
| 会议预订 | ✅ 可用 | 会议室管理 + 预订 / 取消 / 我的预订;行锁排重防时间段冲突 |
| 通知 / 消息 | ✅ 可用 | 前端轮询获取,支持私信即时发送与已读标记 |
| 知识库 RAG | ⚠️ 独立可用 | 上传 → 分块(800 字 / 120 重叠)→ 向量化 → 检索 → 基于上下文作答。`/rag/ask` 可正常调用。**检索依赖智谱 embedding 额度,额度不足时返回 1113 错误** |
| AI 助手 | ✅ 可用 | TypeScript Agent(见 `enterprise-pilot-node/`):10 个工具联动(知识库检索、会议日程、会议室查询、预订会议室、项目列表、任务查询、创建项目任务、更新任务状态、通讯录查找、代发私信),支持并行调用与 SSE 流式作答;LLM 走 APInex `free/hy4` |
| 会议纪要(ASR) | ✅ 已闭环 | 录音转写 + 结构化摘要与行动项提取 + `meeting_summary` / `meeting_todo` 数据库持久化归档 + 待办一键流转为项目任务 |
| 考勤 | ❌ 空壳 | `attendance_record` 表存在,但无 Java 包、无接口、无前端页面 |
| Docker 部署 | ❌ 不可用 | 三个 Dockerfile 缺失,见上文 |

---

## 已知问题

按严重程度排序,详细分析见 [PROJECT_AUDIT.md](PROJECT_AUDIT.md)。

1. **凭据** — `enterprise-pilot-python/.env` 内可能存有真实智谱 API Key。`.gitignore` 已忽略 `*.env`,但物理文件仍在。**若确为真实密钥,请立即到智谱控制台作废并重新签发。**
2. **Docker 无法构建** — 三个 Dockerfile 缺失 / 空目录,详见"方式三"。
3. **embedding 额度** — 知识库检索依赖智谱 `embedding-2`,额度耗尽时 `/rag/ask` 与 Agent 的知识库工具都会失败。Agent 侧已做兜底:工具全失败时直接返回"查询服务暂时不可用",不让模型用常识编造。
4. **Agent 工具执行** — 10 个工具支持并行调用与两段式规划;`MAX_TOOL_ROUNDS` 设为 1 确保流式作答不退化。
5. **写操作安全** — Agent 写操作严格透传用户 JWT,由 Java 核心做项目成员鉴权与防冲突锁,保障数据一致性。
6. **测试与 CI 薄弱** — Java 4 个测试(全过),Node 7 个测试(全过),Python 4 个测试(全过),无 CI 配置。
7. **可观测性缺失** — 无 metrics、无 trace ID,仅靠 `runtime-logs/` 文件日志;MyBatis 日志走 stdout 输出全部 SQL,上线前应改为 SLF4J。
8. **死依赖与冗余配置** — `spring-boot-starter-websocket` 引入尚未全面接管轮询;`mybatis-plus.mapper-locations` 指向不存在的 XML 目录(全部走 `@Select` 注解)。

---

## 相关文档

- [docs/README.md](docs/README.md) — API 端点清单、数据库表结构、部署说明
- [PROJECT_AUDIT.md](PROJECT_AUDIT.md) — 项目梳理报告、分级 findings、按 ROI 排序的改进建议
