# Enterprise Pilot 项目文档

## API 接口概览

### Java 后端(:8080,前缀 `/api`)

| 模块 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 用户 | GET | /users | 用户列表(管理员) |
| 用户 | GET | /users/directory | 通讯录 |
| 用户 | POST | /users/register | 注册 |
| 用户 | POST | /users/login | 登录 |
| 用户 | POST | /users/logout | 登出(Token 加入黑名单) |
| 用户 | GET | /users/me | 当前登录用户信息 |
| 用户 | GET | /users/profile | 获取个人资料 |
| 用户 | PUT | /users/profile | 更新个人资料 |
| 用户 | PUT | /users/password | 修改密码 |
| 部门 | GET | /departments/tree | 部门树 |
| 部门 | POST | /departments | 新增部门(管理员) |
| 部门 | PUT | /departments/{id} | 更新部门(管理员) |
| 部门 | DELETE | /departments/{id} | 删除部门(管理员) |
| 会议室 | GET | /meeting/rooms | 可用会议室 |
| 会议室 | GET | /meeting/rooms/all | 全部会议室 |
| 会议室 | POST | /meeting/rooms | 新增会议室(管理员) |
| 会议室 | PUT | /meeting/rooms/{id} | 更新会议室(管理员) |
| 会议室 | PUT | /meeting/rooms/{id}/disable | 停用会议室(管理员) |
| 会议预订 | GET | /meeting/bookings/room/{roomId} | 按会议室查预订 |
| 会议预订 | GET | /meeting/bookings/my | 我的预订 |
| 会议预订 | POST | /meeting/bookings | 创建预订 |
| 会议预订 | PUT | /meeting/bookings/{id}/cancel | 取消预订 |
| 项目 | POST | /projects | 创建项目 |
| 项目 | GET | /projects/my | 我的项目列表 |
| 项目 | POST | /projects/{projectId}/tasks | 创建项目任务 |
| 项目 | GET | /projects/{projectId}/tasks | 项目任务列表 |
| 项目 | POST | /projects/{projectId}/discussions | 创建讨论 |
| 项目 | GET | /projects/{projectId}/discussion/tree | 讨论树 |
| 消息 | GET | /messages/conversations | 会话列表 |
| 消息 | GET | /messages/with/{userId} | 与某人的聊天记录 |
| 消息 | POST | /messages/send | 发送消息 |
| 消息 | GET | /messages/unread-count | 未读数量 |
| 通知 | GET | /notifications | 通知列表(分页,`page` / `size`) |
| 通知 | GET | /notifications/unread-count | 未读数量 |
| 通知 | PUT | /notifications/{id}/read | 标记已读 |
| 通知 | PUT | /notifications/read-all | 全部已读 |
| 通知 | DELETE | /notifications/{id} | 删除通知 |

> 鉴权:除 `/users/register`、`/users/login` 外均需携带 `Authorization: Bearer <token>`。标注"管理员"的端点在 `SecurityConfig` 中有 `hasAuthority` 限制,其余仅要求登录。

### Python AI 服务(:8001)

| 模块 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 健康检查 | GET | /health | 服务健康状态(**在根路径,不在 `/api/v1` 下**) |
| 知识库 | POST | /api/v1/rag/documents | 上传/向量化文档 |
| 知识库 | GET | /api/v1/rag/documents | 文档列表 |
| 知识库 | GET | /api/v1/rag/documents/{document_id} | 文档详情 |
| 知识库 | DELETE | /api/v1/rag/documents/{document_id} | 删除文档 |
| 知识库 | GET | /api/v1/rag/categories | 分类列表 |
| 知识库 | POST | /api/v1/rag/ask | 基于知识库问答 |
| AI 助手 | POST | /api/v1/agent/chat | 对话 |
| AI 助手 | POST | /api/v1/agent/chat/stream | 流式对话(SSE) |
| 会议 | POST | /api/v1/meetings/summary | 会议纪要生成 |
| 会议 | POST | /api/v1/meetings/transcript | 会议转写 |

Swagger UI:启动后访问 <http://localhost:8001/docs>。

> **注意**:Python 服务的数据库来源是**本地 ChromaDB 向量库**(`CHROMA_PERSIST_DIR`),不是 MySQL。`.env` 里的 `JAVA_BACKEND_URL` 用于 Agent 处理"我的会议/项目/任务"时带着 JWT 回调 Java 取数。

---

## 数据库表结构概览

数据库:`enterprise_pilot`,**共 21 张表**(`sql/schema.sql`)。

### 用户与权限(4 张)

| 表名 | 说明 | 代码引用 |
|------|------|------|
| sys_user | 用户表 | Java `User` |
| sys_department | 部门表 | Java `Department` |
| sys_role | 角色表 | ⚠️ 无实体类 |
| sys_user_role | 用户-角色关联表 | ⚠️ 无实体类 |

### 会议模块(5 张)

| 表名 | 说明 | 代码引用 |
|------|------|------|
| meeting_room | 会议室表 | Java `MeetingRoom` |
| meeting_booking | 会议预订表 | Java `MeetingBooking` |
| meeting_participant | 会议参会人关联表 | Java `MeetingParticipant` |
| meeting_summary | 会议纪要表(含 `process_status`、ASR 文本) | ❌ 无代码引用 |
| meeting_todo | 会议待办事项表 | ❌ 无代码引用 |

### 项目模块(4 张)

| 表名 | 说明 | 代码引用 |
|------|------|------|
| project | 项目表 | Java `Project` |
| project_member | 项目成员表 | Java `ProjectMember` |
| project_task | 项目任务表 | Java `ProjectTask` |
| project_discussion | 项目讨论表 | Java `ProjectDiscussion` |

### 知识库与 AI(5 张)

| 表名 | 说明 | 代码引用 |
|------|------|------|
| knowledge_doc | 知识库文档表 | ❌ 无代码引用 |
| knowledge_chunk | 文档分块表 | ❌ 无代码引用 |
| qa_log | 问答历史记录表 | ❌ 无代码引用 |
| agent_conversation | Agent 会话表 | ❌ 无代码引用 |
| agent_message | Agent 消息表 | ❌ 无代码引用 |

> ⚠️ **本模块 5 张表全部未被代码使用**。RAG 链路实际把文档元数据与分块存在 **ChromaDB** 里(`knowledge_chunks` 集合,与同名 MySQL 表无关),没有回写 MySQL。表结构是设计留存,当前属于空转。

### 其他(3 张)

| 表名 | 说明 | 代码引用 |
|------|------|------|
| chat_message | 站内聊天消息表 | Java `ChatMessage`(消息模块) |
| sys_notification | 通知表 | Java `Notification` |
| attendance_record | 考勤记录表 | ❌ 无代码引用(考勤模块未实现) |

---

## 部署说明

完整的环境要求、三种启动方式与功能状态表见根目录 [README.md](../README.md),此处只列关键步骤。

### 方式一:单机部署(推荐开发环境)

前置条件:Java 17+、Maven 3.8+、Node.js 18+、Python 3.11+、MySQL 8、Redis 7。

1. **配置环境变量**——两个子项目的模板**内容不同**,必须分别复制,不能共用根目录的 `.env.example`:

   ```bash
   copy enterprise-pilot-java\.env.example   enterprise-pilot-java\.env
   copy enterprise-pilot-python\.env.example enterprise-pilot-python\.env
   ```

   - `enterprise-pilot-java/.env` → `DB_URL`、`DB_USERNAME`、`DB_PASSWORD`、`JWT_SECRET`,由 `start.bat` 注入为进程环境变量,再被 `application.yml` 的 `${...}` 读取。
   - `enterprise-pilot-python/.env` → `ZHIPU_API_KEY`、`ZHIPU_BASE_URL`、`ZHIPU_CHAT_MODEL`、`ZHIPU_EMBEDDING_MODEL`、`ASR_ENDPOINT`、`JAVA_BACKEND_URL`、`CHROMA_PERSIST_DIR`,由 `pydantic-settings` 直接从文件加载。

2. 初始化数据库:

   ```bash
   mysql -u root -p < sql/schema.sql
   ```

   需要演示数据时再执行 `sql/seed_data.sql`。

3. 一键启动(自动拉起 Redis、Java、Python、前端):

   ```bash
   start.bat
   ```

4. 停止服务:

   ```bash
   start.bat stop
   ```

> **手工启动 Java 时 `.env` 不会自动生效**,需自行导出为环境变量。日常开发建议直接用 `start.bat`,该逻辑已内置。

### 方式二:Docker 部署

> ⚠️ **当前不可用。** `docker-compose.yml` 为 `java-backend`、`python-ai`、`web` 声明了 `build:` 上下文,但:
> - `enterprise-pilot-java/Dockerfile` —— 缺失
> - `enterprise-pilot-web/Dockerfile` —— 缺失
> - `enterprise-pilot-python/Dockerfile` —— 是 **0 字节的空目录**,不是文件
>
> 补齐这三个文件后下方步骤才能执行。

前置条件:Docker 与 Docker Compose。

1. 配置环境变量:

   ```bash
   copy .env.example .env
   ```

2. 构建并启动全部服务:

   ```bash
   docker-compose up -d --build
   ```

3. 查看状态:

   ```bash
   docker-compose ps
   ```

4. 停止并清理:

   ```bash
   docker-compose down
   ```

> 说明:MySQL 首次启动会自动执行 `sql/schema.sql` 初始化表结构。详细编排见根目录 `docker-compose.yml`。
