# Enterprise Pilot 项目梳理报告

> 生成时间:2026-08-28。对象:`C:\Users\zhang\Desktop\enterprise-pilot`(当前**不是 git 仓库**——`Is a git repository: false`,无 `.git/` 目录)。

## 1. 一句话总结

一个三端架构的企业智能办公平台:
- **Java 后端**([enterprise-pilot-java](enterprise-pilot-java)) —— Spring Boot 4.0.7 + MyBatis-Plus 3.5.15 + Spring Security + JWT + Redis,核心业务(用户/部门/会议室/项目/任务/讨论/站内消息/通知)完整。
- **Python AI 服务**([enterprise-pilot-python](enterprise-pilot-python)) —— FastAPI + 智谱 GLM-4-Flash / embedding-2 + ChromaDB,提供 RAG 知识库、Agent 对话(含 SSE 流式)、会议纪要、ASR 转发。
- **Vue 3 前端**([enterprise-pilot-web](enterprise-pilot-web)) —— Vite 6 + Pinia + Element Plus + axios,9 个页面(登录/概览/会议/项目/消息/通讯录/知识库/AI 助手/帮助/个人)。
- 基础设施:MySQL 8(20 张表)、Redis 7、`start.bat` 一键启动脚本、Docker Compose 编排(但 Dockerfile 缺失)。

整体完成度 ~70%:核心业务闭环可用,RAG/Agent 可用,但项目级授权、Dockerfile、若干细节存在缺口。

---

## 2. 架构拓扑

```
Web (Vue 3, :5173)  ──>  Java (Spring Boot, :8080)  ──>  Python (FastAPI, :8001)
  Element Plus              MyBatis-Plus                   智谱 GLM-4-Flash
  Pinia                     Spring Security + JWT           ChromaDB
  axios                     Redis 缓存 / 黑名单 / 角色缓存   java_client → Java
```

请求流:
1. 前端登录 → `POST /api/users/login` 拿 JWT(24h 过期)→ 存 Pinia + `localStorage`。
2. axios 拦截器自动塞 `Authorization: Bearer <token>`。401 触发自动登出。
3. 业务接口走 `/api/*`(Vite 代理到 8080),AI 走 `/ai/api/v1/*`(Vite 代理到 8001,rewrite 去掉 `/ai` 前缀)。
4. Python 服务的 `JavaClient` 反向携带用户 token 调用 Java 的 `/api/meeting/bookings/my`、`/api/projects/my`、`/api/projects/{id}/tasks` 来组装 Agent 回答。

---

## 3. Java 后端(Spring Boot 4.0.7,Java 17)

**关键依赖**([pom.xml](enterprise-pilot-java/pom.xml)):`mybatis-plus-spring-boot4-starter 3.5.15`、`jjwt 0.12.6`、`spring-boot-starter-security`、`spring-boot-starter-data-redis`、`spring-boot-starter-webmvc`、`spring-boot-starter-websocket`、`spring-boot-starter-validation`、`mysql-connector-j`、`lombok`。

**启动**:`EnterprisePilotJavaApplication.main`([文件](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/EnterprisePilotJavaApplication.java))。`application.yml` 在 [src/main/resources/application.yml](enterprise-pilot-java/src/main/resources/application.yml),`mybatis-plus.mapper-locations` 指向 `classpath*:mapper/**/*.xml`,但**项目里没有任何 XML 映射文件**,全用 `@Mapper` + `@Select` 注解实现——这个配置是空跑的,无害但多余。

**通用基础**:
- [common/result/Result.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/common/result/Result.java) / [ResultCode.java](enterprise-pilot-java/src/main/java/com/zzhang/enterprisepilotjava/common/result/ResultCode.java) — 统一响应码(200/400/401/403/404/500/600)。
- [common/exception/GlobalExceptionHandler.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/common/exception/GlobalExceptionHandler.java) + `BusinessException` — 业务异常统一处理。
- [common/service/RedisService.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/common/service/RedisService.java) — 对 `StringRedisTemplate` 的薄封装,所有 key 前缀 `enterprise:pilot:`。
- [common/util/SecurityUtil.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/common/util/SecurityUtil.java) — 从 `SecurityContextHolder` 拿当前 userId。
- [config/JacksonConfig.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/config/JacksonConfig.java) + `FlexibleLocalDateTimeDeserializer` — Jackson 全局配置(注:用了 `tools.jackson.*` 这个 Spring Boot 4 引入的新包名,而非 `com.fasterxml.jackson.*`)。

**认证链路**(完整且扎实):
- 密码:[PasswordConfig.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/config/PasswordConfig.java) — `BCryptPasswordEncoder`。
- JWT:[JwtUtil.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/common/util/JwtUtil.java) + [JwtProperties.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/config/JwtProperties.java) — HS256 签名,24h 过期,Redis 黑名单(token 剩余时长内失效)。
- 过滤器:[JwtAuthenticationFilter.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/common/filter/JwtAuthenticationFilter.java) — `OncePerRequestFilter`,先看 Bearer 头 → 校验 token → 拿 userId → 查角色码(优先 Redis 缓存,10 分钟)→ 写入 `SecurityContext`。
- 安全配置:[SecurityConfig.java](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/config/SecurityConfig.java) — 无状态 + CSRF 关闭 + `/users/register|login` 放行 + 会议室/部门的 POST/PUT/DELETE 限 `ROLE_ADMIN` + `/users` 列表限 `ROLE_ADMIN` + 其余需登录。
- 用户角色查询:[UserMapper.selectRoleCodesByUserId](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/user/mapper/UserMapper.java) 用 `@Select` 注解 SQL 联表 `sys_user_role` / `sys_role`。

**业务模块**:

| 模块 | Controller | Service | 实体 | 关键能力 |
|---|---|---|---|---|
| 用户 | [UserController](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/user/controller/UserController.java) | [UserServiceImpl](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/user/service/impl/UserServiceImpl.java) | [User](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/user/entity/User.java) | 注册/登录/我/资料/改密/登出(黑名单)/在职通讯录;资料 5min 缓存,改资料/角色时主动失效 |
| 部门 | [DepartmentController](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/department/controller/DepartmentController.java) | [DepartmentServiceImpl](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/department/service/impl/DepartmentServiceImpl.java) | [Department](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/department/entity/Department.java) | 部门树 CRUD(写操作限管理员) |
| 会议室 | [MeetingRoomController](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/meeting/controller/MeetingRoomController.java) | [MeetingRoomServiceImpl](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/meeting/service/impl/MeetingRoomServiceImpl.java) | [MeetingRoom](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/meeting/entity/MeetingRoom.java) | 会议室 CRUD/停用/查询可用 |
| 会议预约 | [MeetingBookingController](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/meeting/controller/MeetingBookingController.java) | [MeetingBookingServiceImpl](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/meeting/service/impl/MeetingBookingServiceImpl.java) | [MeetingBooking](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/meeting/entity/MeetingBooking.java) + [MeetingParticipant](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/meeting/entity/MeetingParticipant.java) | 创建用 `selectByIdForUpdate` 锁行 + `countConflicts` 检冲突,创建后给组织者发通知;仅组织者可取消 |
| 项目 | [ProjectController](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/project/controller/ProjectController.java) | [ProjectServiceImpl](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/project/service/impl/ProjectServiceImpl.java) | [Project](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/project/entity/Project.java) + [ProjectMember](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/project/entity/ProjectMember.java) | 创建项目(创建者自动为 leader)、我的项目(3min Redis 缓存)、任务、讨论树 |
| 站内消息 | [MessageController](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/message/controller/MessageController.java) | [MessageServiceImpl](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/message/service/impl/MessageServiceImpl.java) | [ChatMessage](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/message/entity/ChatMessage.java) | 会话列表/与某人的消息/发送/未读数 |
| 通知 | [NotificationController](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/notification/controller/NotificationController.java) | [NotificationServiceImpl](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/notification/service/impl/NotificationServiceImpl.java) | [Notification](enterprise-pilot-java/src/main/java/com/zhang/enterprisepilotjava/notification/entity/Notification.java) | 列表分页/未读数/已读/全部已读/删除 |

**测试**:`src/test/java` 下唯一测试类 [ProjectAuthorizationServiceTest.java](enterprise-pilot-java/src/test/java/com/zhang/enterprisepilotjava/project/service/ProjectAuthorizationServiceTest.java),`mvn test` 跑出 `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0` —— 全过。

**环境变量**([.env.example](enterprise-pilot-java/.env.example) 仅 4 个):`DB_URL` / `DB_USERNAME` / `DB_PASSWORD` / `JWT_SECRET`,**没有** `ZHIPU_API_KEY` 与 `REDIS_HOST/PORT`,但 application.yml 与 start.bat 都依赖前两者(Redis host 写死 localhost:6379,智谱 key 没在 Java 端用但 start.bat 仍校验它)。

---

## 4. Python AI 服务(FastAPI)

**依赖**([requirements.txt](enterprise-pilot-python/requirements.txt)):`fastapi`、`uvicorn[standard]`、`pydantic-settings`、`httpx`、`chromadb`、`python-multipart`、`pytest`(没有 langchain / openai / tiktoken,完全裸调智谱 OpenAI 兼容协议)。

**配置**([app/core/config.py](enterprise-pilot-python/app/core/config.py)):用 `pydantic-settings` 读 `.env`,默认走智谱 `glm-4-flash` + `embedding-2` + `chroma_persist_dir=./chroma_data` + `java_backend_url=http://localhost:8080`,**没有 DEBUG 鉴权**(`/api/v1/*` 全部放行,JavaClient 用透传的用户 Bearer token 调 Java)。

**入口**([app/main.py](enterprise-pilot-python/app/main.py)):FastAPI 挂 `/api/v1`(由 [router.py](enterprise-pilot-python/app/api/v1/router.py) 组装) + `/health` + `AppError` 异常处理。

**模块**:
- [api/v1/rag.py](enterprise-pilot-python/app/api/v1/rag.py) + [services/rag_service.py](enterprise-pilot-python/app/services/rag_service.py) + [vector_store/chroma_client.py](enterprise-pilot-python/app/vector_store/chroma_client.py) — 知识库:
  - `POST /api/v1/rag/documents` 入库(800 字一段,120 字 overlap,用智谱 embedding,metadatas 包含 title/category/created_at)
  - `GET /api/v1/rag/documents` 列表、`GET /{id}` 详情、`DELETE /{id}`、`GET /categories`(返回 Chroma 中用过的分类 + 默认 4 个)
  - `POST /api/v1/rag/ask` 向量检索 top_k → 拼成 context → 让 LLM "Answer only from the supplied context. State when context is insufficient."
- [api/v1/agent.py](enterprise-pilot-python/app/api/v1/agent.py) + [services/agent_service.py](enterprise-pilot-python/app/services/agent_service.py) — AI 助手:
  - `POST /api/v1/agent/chat` 普通对话 + `POST /api/v1/agent/chat/stream` SSE 流式(自定义 `event: tool|done|error` + `data: {...}`)。
  - `AgentService.prepare()` 是**关键词路由 if/else**:`"我的会议"` / `"我的项目"` / `"我的任务"` 分别走 java_client 调 Java 接口,把数据塞进 system prompt 让 LLM 总结;其他问题直接发 LLM,**没有真正的 tool use / function calling**,也没有接 RAG 检索。
- [api/v1/meeting.py](enterprise-pilot-python/app/api/v1/meeting.py) + [services/meeting_service.py](enterprise-pilot-python/app/services/meeting_service.py) — 会议纪要:
  - `POST /api/v1/meetings/summary` 用 LLM 总结 transcript。
  - `POST /api/v1/meetings/transcript` 转发到 `ASR_ENDPOINT`([asr_client.py](enterprise-pilot-python/app/clients/asr_client.py))做语音转写(智谱 ASR 还是别家未配,默认空)。
- [clients/llm_client.py](enterprise-pilot-python/app/clients/llm_client.py) — 智谱 chat/embeddings/stream,60s/120s 超时,无重试。
- [clients/java_client.py](enterprise-pilot-python/app/clients/java_client.py) — 反向代理 Java 三个端点,带原 `Authorization` 头。
- [common/deps.py](enterprise-pilot-python/app/common/deps.py) — `optional_authorization` 依赖,把 Bearer 透传给 service(可选)。

**测试**([tests/](enterprise-pilot-python/tests)):只有 [test_rag.py](enterprise-pilot-python/tests/test_rag.py) + [test_agent.py](enterprise-pilot-python/tests/test_agent.py),体量小,无 CI 配置。

---

## 5. Vue 3 前端

**技术栈**([package.json](enterprise-pilot-web/package.json)):Vue 3.5 + Vite 6 + Pinia 2 + Element Plus 2.9 + `@element-plus/icons-vue` + `lucide-vue-next` + `axios` + `dayjs` + `markdown-it`(AI 消息用其渲染)。

**入口**([src/main.js](enterprise-pilot-web/src/main.js)):挂 Pinia + Router + Element Plus(zh-CN) + 全量注册 Element Plus 图标。

**路由**([src/router/index.js](enterprise-pilot-web/src/router/index.js)):9 个子页面挂在 `MainLayout` 下,守卫检查 `userStore.token`;`/login` 公开;未知路径跳 `/dashboard`。

| 路由 | 视图 | 用途 |
|---|---|---|
| `/login` | [Login.vue](enterprise-pilot-web/src/views/Login.vue) | 登录 |
| `/dashboard` | [Dashboard.vue](enterprise-pilot-web/src/views/Dashboard.vue) | 概览 |
| `/meetings` | [Meetings.vue](enterprise-pilot-web/src/views/Meetings.vue) | 会议室预约 |
| `/projects` | [Projects.vue](enterprise-pilot-web/src/views/Projects.vue) | 项目看板 |
| `/messages` | [Messages.vue](enterprise-pilot-web/src/views/Messages.vue) | 站内消息 |
| `/directory` | [Directory.vue](enterprise-pilot-web/src/views/Directory.vue) | 通讯录 |
| `/knowledge` | [Knowledge.vue](enterprise-pilot-web/src/views/Knowledge.vue) | 知识库 |
| `/agent` | [Agent.vue](enterprise-pilot-web/src/views/Agent.vue) | AI 助手(消费 SSE 流) |
| `/help` | [Help.vue](enterprise-pilot-web/src/views/Help.vue) | 帮助中心 |
| `/profile` | [Profile.vue](enterprise-pilot-web/src/views/Profile.vue) | 个人主页 |

**HTTP**:
- [api/request.js](enterprise-pilot-web/src/api/request.js) — axios 实例,baseURL 空(走 Vite 代理),30s 超时;响应拦截器按 `code` 判断(200 → 解 `data`,401 → 自动 logout + 跳登录,其他 → ElMessage 报错)。
- [api/index.js](enterprise-pilot-web/src/api/index.js) — 集中导出 7 个 api 命名空间(user / department / meeting / project / rag / agent / notification / message),AI 接口全部走 `/ai/api/v1/*` 前缀。
- [vite.config.js](enterprise-pilot-web/vite.config.js) — dev 代理:`/api` → 127.0.0.1:8080;`/ai` → 127.0.0.1:8001(rewrite 去前缀)。

**状态**([src/stores/](enterprise-pilot-web/src/stores)):`user.js`(token + userInfo,持久化 localStorage)、`app.js`、`notification.js`(未读数轮询/订阅)、`message.js`。

**亮点**:
- [Agent.vue](enterprise-pilot-web/src/views/Agent.vue) 用 `fetch + ReadableStream` 自己解析 SSE(`event: tool | done | error` + `data:`),含 stop/abort、消息持久化到 `localStorage`、点赞点踩、复制/重新生成/导出 Markdown。
- [utils/markdown.js](enterprise-pilot-web/src/utils/markdown.js) 自定义 markdown 渲染。

**生产构建**:只有 `vite build`,无 nginx 配置、无 Dockerfile。`dist/` 已被 gitignore 忽略,本地构建产物可由 `start.bat` 跳过(它只跑 dev server)。

---

## 6. 数据库(20 张表,[sql/schema.sql](sql/schema.sql))

| 分区 | 表 | 关键字段 / 备注 |
|---|---|---|
| 用户/组织 | `sys_user` `sys_department` `sys_role` `sys_user_role` | `sys_user.dept_id` 外键补在脚本末尾避免循环依赖;`is_deleted` 逻辑删除字段(MP 配置) |
| 会议 | `meeting_room` `meeting_booking` `meeting_participant` `meeting_summary` `meeting_todo` | 预约表复合索引 `(room_id, start_time, end_time)` 防冲突扫描 |
| 知识库/AI | `knowledge_doc` `knowledge_chunk` `qa_log` `agent_conversation` `agent_message` | `agent_message` 存 `tool_calls/tool_result` JSON |
| 项目 | `project` `project_member` `project_task` `project_discussion` | 讨论表 `parent_id` 自引用树形 |
| 其它 | `attendance_record` `sys_notification` `chat_message` | 考勤按 `work_date` 唯一约束 |

**建表 SQL 还包含**末尾的 `insert into sys_role ...` 把 `ROLE_ADMIN / ROLE_MANAGER / ROLE_EMPLOYEE` 三种角色种子写好(密码种子在 `seed_data.sql`)。

**演示账号**([sql/seed_data.sql](sql/seed_data.sql)):所有新用户密码统一 BCrypt 哈希 `$2a$10$EUp9...`(原文 `test654321`)。包括 `admin`(id=1)、`zhangsan`(id=2 后端)、`jason`(id=3 产品经理)、`chenjing`(id=10 UI)等。脚本可重复执行,会先 `delete from xxx where id >= 6` 再重新灌。

`seed_xiaowang.sql` 存在但未读,推测是另一种角色/数据场景。

---

## 7. 基础设施 / 启动

**`start.bat`**([start.bat](start.bat)) 是 Windows 一键脚本:自动检测 Java/Maven/Node/Python/Redis 路径 → 校验 .env → 缺失则从 `.env.example` 复制 → 自动建 venv 并装依赖(优先 chroma-hnswlib 预编译 wheel,失败提示装 VS C++ Build Tools 或 Python 3.12)→ 三个服务都用 `Start-Process` 最小化后台启动,日志落到 `runtime-logs/{java,python,web}.{out,err}.log` → 等端口就绪 → 打开 `http://localhost:5173`。`stop` 子命令扫 6379/8080/8001/5173 端口 PID 杀进程。

**`docker-compose.yml`** 编排了 5 个服务:`mysql`(挂载 `sql/schema.sql` 自动初始化)、`redis`、`java-backend`、`python-ai`、`web`。**`java-backend` 和 `web` 的 `build:` 找不到 Dockerfile**(`enterprise-pilot-java/Dockerfile` 和 `enterprise-pilot-web/Dockerfile` 都缺失),`python-ai` 对应的 Dockerfile 是空文件(0 字节)。所以 `docker-compose up -d --build` **当前无法成功**。

**`.merkle-snapshot.json`**:107KB,495 个文件的 hash+size+mtime + root hash,看起来是 Claude Code 的工程索引快照,可清理。`.gitignore` 已忽略。

---

## 8. 文档

- 顶层 [README.md](README.md) 给了一句话简介、架构图、技术栈表、快速启动。
- [docs/README.md](docs/README.md) 列出 Java + Python 全部 API(30+ 个端点)、20 张表概览、单机部署步骤、Docker 部署步骤。
- 但 docs 与 `start.bat` / `docker-compose.yml` 在 ZHIPU_API_KEY 是否归 Java 端管理上表述不一致:docs 说"配置 .env 填写数据库账号密码、JWT 密钥、智谱 API Key"模糊带过,start.bat 强制要求 5 个变量都存在,Java `.env.example` 实际只声明 4 个。

---

## 9. 重要 Findings(按严重级)

### High

1. **项目级授权未落地**:`ProjectAuthorizationService` 已经写好并通过 3 个单测(覆盖 owner / member / 非 member),但 `ProjectController` 全部端点、`ProjectServiceImpl`、`ProjectTaskServiceImpl`、`ProjectDiscussionServiceImpl` **没有一处调用 `requireMember()`**。结果:`GET /api/projects/{projectId}/tasks`、`POST /api/projects/{projectId}/discussions`、`GET /api/projects/{projectId}/discussion/tree` 对任何登录用户都开放,既能看到别人的项目任务,也能在别人的项目下发讨论。修法:在对应 Service/Controller 加 `projectAuthorizationService.requireMember(projectId)`。

2. **`docker-compose.yml` 实际无法构建**:`java-backend` 与 `web` 服务声明了 `build: context: ...` 但缺少 Dockerfile;`python-ai` 的 Dockerfile 是 0 字节空文件。docs 写"Docker 部署"会给用户误导。需要补 3 个 Dockerfile,或者从 compose 移除 build 转而用 `image:` 引用预构建镜像。

3. **Python `.env` 已在仓库内且含真实智谱 API key**:`enterprise-pilot-python/.env` 写有 `ZHIPU_API_KEY=bf8b6eacd75d4367b3a2538d21655e26.fWcAf8qnIeRn72Ed`。虽然当前整个目录**不是 git 仓库**(无 `.git/`),且 `.gitignore` 第 27 行 `*.env` 已加忽略,但 `.env` 已被物理写入仓库根。一旦将来 `git init` 而忽略规则没生效,或文件被打包分发/上传,密钥即泄露。**立即行动**:登录智谱控制台作废此 key,重新签发。

### Medium

4. **Java 子项目 `.env.example` 不完整**:只有 4 个变量,缺 `ZHIPU_API_KEY`、`REDIS_HOST`、`REDIS_PORT`。Redis 配置在 application.yml 写死为 `localhost:6379`,Docker 部署时需要覆盖;start.bat 又校验 5 个变量都存在(包括 ZHIPU_API_KEY),如果不补 `.env.example` 用户会被同一个 .env 复制到两处。

5. **MyBatis-Plus XML 路径配置悬空**:`mybatis-plus.mapper-locations: classpath*:mapper/**/*.xml`,但项目无任何 XML 映射文件,全部走 `@Select` 注解。可以删掉这行(以及 `mybatis-plus.configuration.log-impl` 把 SQL 打到 stdout 改成生产噪音)。

6. **Spring Security 配置不完整**:`SecurityConfig` 只配置了"管理员才能写会议室/部门"和"管理员才能看用户列表",`ProjectController` 没有任何 `hasAuthority` 限制,前端 `/projects`、`/messages` 等也无角色区分,普通员工可以创建项目但不能管理成员;**而 Meeting 房间的 GET 列表是放行的**(任何人都能看),这部分没问题,但 `/api/projects` POST 同样对所有人开放——是设计取舍还是漏洞,需明确。

7. **Python Agent 不是真正的 tool-use**:`AgentService.prepare` 用中文/英文关键词做 if/else 路由,任何不命中"我的会议/项目/任务"的问题都不接 RAG,直接发 LLM。意味着 AI 助手的"知识库"标签([Agent.vue](enterprise-pilot-web/src/views/Agent.vue) 顶部 tags 之一)是**虚假宣传**——目前没有"问知识库"这条路径。要么去掉"知识库"标签,要么在 prepare 里加 RAG 路由(如用户消息含特定关键字 → 先 `/rag/ask` 再让 LLM 整合回答)。

8. **会议模块的 ASR 闭环未实现**:`MeetingBookingServiceImpl.createBooking` 只发一条"预约成功"通知,从不触发转写/纪要流程;`meeting_summary` 表有 `process_status` 字段但**没有任何代码写入**。`POST /api/v1/meetings/summary` 和 `/transcript` 是孤岛端点,需要前端/调度器串起来。

9. **考勤模块空壳**:`attendance_record` 表存在,但 Java 端没有 `attendance` 包、没有 controller、没有 service。前端也没"考勤"页面。`seed_data.sql` 一上来就 `delete from attendance_record`,印证这是为后续扩展留的占位。

### Low

10. **Jackson 包名混用**:Spring Boot 4 引入新包 `tools.jackson.*`(`UserServiceImpl`、`JacksonConfig`、`RedisService` 都在用),`pom.xml` 仍走 spring-boot-starter-webmvc(可能已传递 `tools.jackson` 依赖),确认能编译启动——但与社区常见 `com.fasterxml.jackson.*` 教程不同,接手者要重新熟悉。

11. **DTO 校验**:UserController 用 `@Valid` 校验 updateProfileDTO/changePassword,ProjectController 也是 `@Valid`,但 MeetingBookingController.create(BookingCreateDTO) 也用了 `@Valid`;这部分 OK。**`/users/login` 与 `/users/register` 没有 `@Valid`**,登录 DTO 没有约束注解意味着空 body 会直通到 lambdaQuery。需要补 `@NotBlank`。

12. **日志打到 stdout**:`mybatis-plus.configuration.log-impl: org.apache.ibatis.logging.stdout.StdOutImpl` 会让所有 SQL 进 `runtime-logs/java.out.log`,生产部署前应改为 SLF4J。

13. **WebSocket 引入但未见使用**:`pom.xml` 含 `spring-boot-starter-websocket`,Java 代码里没看到 `WebSocketConfigurer` / `@MessageMapping` 等,目前是死依赖。要么删依赖要么用来做通知/消息的实时推送(目前通知/消息都靠前端轮询)。

14. **前端没做 Web 生产部署配套**:`vite build` 产物走 nginx 还是别的没说;docker-compose 里 `web` 容器 expose 80 但缺 Dockerfile 与 nginx 配置。短期可接受(开发用 `npm run dev`),上线前需补。

15. **API 文档**:docs/README.md 列了端点清单但不是 OpenAPI/Swagger,Java 端可以加 springdoc-openapi,Python 端 FastAPI 自带 `/docs` 但 docs 没说。Python 端 `/docs` 可直接看。

16. **类型安全**:Python 服务没有用 `Annotated`/`Field` 在 schema 上加 description,Swagger UI 信息偏少;Java VO/DTO 全靠 Lombok `@Data`,没有 JavaDoc。

17. **测试覆盖**:Java 只有 1 个测试类(3 个用例),Python `tests/` 也很薄,CI/CD 配置缺失。

18. **可观测性**:无 metrics、无 trace ID,仅靠 `runtime-logs/` 文件日志。

---

## 10. 推荐下一步(按 ROI 排序)

1. **立即作废并轮换 `enterprise-pilot-python/.env` 里的智谱 API key**(已在仓库内的真实密钥)。
2. **补 Dockerfile**:`enterprise-pilot-java/Dockerfile`(基于 `eclipse-temurin:17-jre` + 跑 jar)、`enterprise-pilot-web/Dockerfile`(node build → nginx serve)、把 `python-ai` 的 Dockerfile 写完整(`python:3.12-slim` + pip install + uvicorn)。
3. **接入 `ProjectAuthorizationService.requireMember()`** 到 ProjectController/Service 的所有 `{projectId}` 路径,或写一个 `@PreAuthorize` 切面统一拦截。
4. **补 `enterprise-pilot-java/.env.example`**(`ZHIPU_API_KEY`、`REDIS_HOST`、`REDIS_PORT`)与 `docker-compose.yml` 的环境变量对齐。
5. **实现 ASR → 纪要闭环**:Booking 创建完成后入队,Python worker 拉取 audio_url → ASR → LLM 写 `meeting_summary`,再触发 `meeting_todo` 抽取。
6. **升级 AgentService**:把"问知识库"接进 RAG 流程(关键词 or LLM 决策),删掉"知识库"标签的虚假宣传或实装它。
7. **清理**:删 `mybatis-plus.mapper-locations` 多余配置、删 `spring-boot-starter-websocket` 死依赖、删 `.merkle-snapshot.json`、删未用 `attendance_record` 表或实现考勤页。

---

## 11. 文件清单(本报告引用)

- 入口/配置:[README.md](README.md)、[docker-compose.yml](docker-compose.yml)、[start.bat](start.bat)、[.env.example](.env.example)、[.gitignore](.gitignore)
- 数据库:[sql/schema.sql](sql/schema.sql)、[sql/seed_data.sql](sql/seed_data.sql)
- 文档:[docs/README.md](docs/README.md)
- Java 后端:[pom.xml](enterprise-pilot-java/pom.xml)、[application.yml](enterprise-pilot-java/src/main/resources/application.yml)
- Python AI:[requirements.txt](enterprise-pilot-python/requirements.txt)
- 前端:[package.json](enterprise-pilot-web/package.json)、[vite.config.js](enterprise-pilot-web/vite.config.js)、[src/router/index.js](enterprise-pilot-web/src/router/index.js)、[src/api/index.js](enterprise-pilot-web/src/api/index.js)、[src/api/request.js](enterprise-pilot-web/src/api/request.js)、[src/views/Agent.vue](enterprise-pilot-web/src/views/Agent.vue)
