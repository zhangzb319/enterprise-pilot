# Enterprise Pilot 企业智能办公平台

集项目管理、会议管理、知识库、AI 助手、消息与通知于一体的企业办公平台,采用 **Web 前端 + Java 业务后端 + Python AI 服务** 的三端架构。

---

## 架构

```
+------------------+        +------------------+        +------------------+
|  enterprise-     |  HTTP  |  enterprise-     |  HTTP  |  enterprise-     |
|  pilot-web       | -----> |  pilot-java      | -----> |  pilot-python    |
|  Vue 3 + Vite    |  :5173 |  Spring Boot 4   |  :8080 |  FastAPI         |
|  Element Plus    |        |  MySQL + Redis   |        |  Chroma + 智谱   |
+------------------+        +------------------+        +------------------+
```

前端开发服务器通过 Vite 代理把 `/api` 转发到 Java 后端、`/ai` 转发到 Python 服务,浏览器侧无需处理跨域。

- **Web 前端**(:5173):Vue 3 单页应用,负责页面渲染与用户交互
- **Java 后端**(:8080):Spring Boot 业务服务,负责认证授权、业务逻辑与数据持久化
- **Python AI 服务**(:8001):FastAPI 智能服务,负责知识库向量检索、AI 对话与会议纪要

> Java 与 Python 是**平级**的两个服务,前端分别调用。Java 并不反向调用 Python,只有 Python 在处理"我的会议/项目/任务"类问题时,会带着用户的 JWT 回调 Java 取数。

---

## 技术栈

| 模块 | 技术 | 版本 |
|------|------|------|
| 后端 | Java + Spring Boot + MyBatis-Plus | 17 / 4.0.7 / 3.5.15 |
| AI 服务 | Python + FastAPI + ChromaDB | 3.11+ |
| 前端 | Vue 3 + Vite + Element Plus + Pinia | 3.5 / 6.0 / 2.9 / 2.3 |
| 数据库 | MySQL | 8.x |
| 缓存 | Redis | 7.x |
| LLM | 智谱 GLM(`glm-4-flash` + `embedding-2`) | — |

---

## 环境要求

- Java 17+ 与 Maven 3.8+(也可用仓库自带的 `mvnw`)
- Node.js 18+
- Python 3.11+
- MySQL 8
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
   mysql -u root -p < sql/schema.sql
   ```

   需要演示数据时再执行 `sql/seed_data.sql`。

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

补全这三个文件后 `docker-compose up -d --build` 才能工作。MySQL 首次启动会自动执行 `sql/schema.sql` 初始化表结构。

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
│       ├── project/           # 项目、成员、任务、讨论(含 ProjectAuthorizationService)
│       ├── meeting/           # 会议室与会议预订
│       ├── message/           # 站内消息
│       └── notification/      # 通知
├── enterprise-pilot-python/   # FastAPI AI 服务
│   └── app/
│       ├── api/v1/            # 路由:rag、agent、meeting
│       ├── services/          # rag_service、agent_service、meeting_service
│       ├── clients/           # llm_client(智谱)、java_client(回调 Java)、asr_client
│       ├── vector_store/      # chroma_client 向量库封装
│       ├── schemas/           # Pydantic 出入参
│       └── core/              # 配置、日志、异常
├── enterprise-pilot-web/      # Vue 3 前端
│   └── src/
│       ├── views/             # 10 个页面:登录、工作台、项目、会议、知识库、
│       │                      #   AI 助手、消息、通讯录、个人资料、帮助
│       ├── stores/            # Pinia:user、app、message、notification
│       ├── api/               # axios 实例与接口封装
│       ├── layouts/           # MainLayout 主框架
│       └── router/            # 路由与登录守卫
├── sql/                       # schema.sql 建表 + seed_data.sql 演示数据
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
| Python AI 服务 | 8001 | 前缀 `/api/v1`,自带 Swagger UI(`/docs`) |
| MySQL | 3306 | 数据库 `enterprise_pilot` |
| Redis | 6379 | 缓存(项目成员、我的项目列表、JWT 黑名单) |

完整端点清单与 20 张表的结构概览见 [docs/README.md](docs/README.md)。

---

## 功能状态

诚实标注当前实现程度,避免按图索骥时踩空。

| 模块 | 状态 | 说明 |
|------|------|------|
| 用户 / 认证 | ✅ 可用 | 注册、登录、JWT、登出黑名单、资料与密码修改 |
| 部门 | ✅ 可用 | 部门树 + 管理员增删改 |
| 项目 | ✅ 可用 | 项目、成员、任务、讨论树;`ProjectTaskServiceImpl` / `ProjectDiscussionServiceImpl` 已接入成员鉴权 |
| 会议预订 | ✅ 可用 | 会议室管理 + 预订 / 取消 / 我的预订 |
| 通知 / 消息 | ✅ 可用 | 前端轮询获取 |
| 知识库 RAG | ⚠️ 独立可用 | 上传 → 分块(800 字 / 120 重叠)→ 向量化 → 检索 → 基于上下文作答。`/rag/ask` 可正常调用 |
| AI 助手 | ⚠️ 部分可用 | `AgentService` 用**关键词 if/else** 判断"我的会议 / 我的项目 / 我的任务"并回调 Java 取数;**未接入 RAG**,页面上"知识库"标签目前无对应链路 |
| 会议纪要(ASR) | ❌ 未闭环 | `meeting_summary.process_status` 无代码写入,`/meetings/summary` 与 `/transcript` 是孤立端点,预约成功后不会自动触发 |
| 考勤 | ❌ 空壳 | `attendance_record` 表存在,但无 Java 包、无接口、无前端页面 |
| Docker 部署 | ❌ 不可用 | 三个 Dockerfile 缺失,见上文 |

---

## 已知问题

按严重程度排序,详细分析见 [PROJECT_AUDIT.md](PROJECT_AUDIT.md)。

1. **凭据** — `enterprise-pilot-python/.env` 内可能存有真实智谱 API Key。该目录**不是 git 仓库**(无 `.git/`),`.gitignore` 也已忽略 `*.env`,但物理文件仍在。**若确为真实密钥,请立即到智谱控制台作废并重新签发。**
2. **Docker 无法构建** — 三个 Dockerfile 缺失 / 空目录,详见"方式三"。
3. **AI 助手未接 RAG** — "知识库"标签名不符实;`rag_service.ask()` 已实现但无调用方,接线成本很低。
4. **Agent 非真正 tool-use** — 关键词路由写死在 `prepare()` 里,换个说法就命中不了。
5. **测试与 CI 薄弱** — Java 2 个测试类(其中 3 个用例覆盖项目鉴权),Python 2 个测试文件,无 CI 配置。
6. **可观测性缺失** — 无 metrics、无 trace ID,仅靠 `runtime-logs/` 文件日志;MyBatis 日志走 stdout 输出全部 SQL,上线前应改为 SLF4J。
7. **死依赖与冗余配置** — `spring-boot-starter-websocket` 引入未使用;`mybatis-plus.mapper-locations` 指向不存在的 XML 目录(全部走 `@Select` 注解)。

---

## 相关文档

- [docs/README.md](docs/README.md) — API 端点清单、数据库表结构、部署说明
- [PROJECT_AUDIT.md](PROJECT_AUDIT.md) — 项目梳理报告、分级 findings、按 ROI 排序的改进建议
