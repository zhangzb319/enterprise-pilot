-- ============================================
-- enterprise_pilot 演示数据（seed_data.sql）
-- 说明：在 schema.sql 建表后执行。脚本幂等，可重复执行。
-- 新用户密码统一为 test654321（复用 testviewer 的 BCrypt 哈希）
-- ============================================

use enterprise_pilot;

-- ============================================
-- 0. 清理旧的种子数据（保留基础用户 1/2/3/5），保证可重复执行
-- ============================================

delete from attendance_record;
delete from sys_notification;
delete from knowledge_doc;
delete from meeting_participant;
delete from meeting_booking;
delete from project_discussion;
delete from project_task;
delete from project_member;
delete from project;
delete from sys_user_role;
update sys_department set leader_id = null;
delete from sys_user where id >= 6;

-- 重置自增，保证后续插入的 ID 稳定（项目/会议等外键依赖这些 ID）
alter table sys_user auto_increment = 6;
alter table project auto_increment = 1;
alter table project_task auto_increment = 1;
alter table project_discussion auto_increment = 1;
alter table meeting_booking auto_increment = 1;
alter table meeting_participant auto_increment = 1;
alter table knowledge_doc auto_increment = 1;
alter table sys_notification auto_increment = 1;
alter table attendance_record auto_increment = 1;

-- ============================================
-- 1. 用户：补全基础用户 + 新增团队成员
-- ============================================

update sys_user set password_hash='$2a$10$EUp9E7L2Oq0j..nprfxKPOxR4/aW15nttcspzSvp7dRSshnAVGVVC', dept_id=1, position='系统管理员', gender=1, phone='13800000001', email='admin@example.com', hire_date='2023-01-01' where id=1;
update sys_user set dept_id=3, position='后端工程师', gender=1, phone='13800000002', email='zhangsan@example.com', hire_date='2024-03-15' where id=2;
update sys_user set dept_id=1, position='产品经理', gender=1, phone='13800000003', email='jason@example.com', hire_date='2023-06-01' where id=3;
update sys_user set dept_id=1, position='测试工程师', gender=1, phone='13800000005', email='viewer@example.com', hire_date='2025-01-10', real_name='陈晨', nickname='陈晨' where id=5;

insert into sys_user (employee_no, dept_id, username, password_hash, nickname, real_name, gender, phone, email, position, status, hire_date) values
('EP0006', 4, 'zhangwei', '$2a$10$EUp9E7L2Oq0j..nprfxKPOxR4/aW15nttcspzSvp7dRSshnAVGVVC', '阿伟', '张伟', 1, '13800000006', 'zhangwei@example.com', '前端工程师', 1, '2024-05-20'),
('EP0007', 2, 'lina', '$2a$10$EUp9E7L2Oq0j..nprfxKPOxR4/aW15nttcspzSvp7dRSshnAVGVVC', '娜娜', '李娜', 2, '13800000007', 'lina@example.com', '产品经理', 1, '2023-09-01'),
('EP0008', 3, 'wangqiang', '$2a$10$EUp9E7L2Oq0j..nprfxKPOxR4/aW15nttcspzSvp7dRSshnAVGVVC', '强哥', '王强', 1, '13800000008', 'wangqiang@example.com', '后端工程师', 1, '2024-07-15'),
('EP0009', 1, 'liuyang', '$2a$10$EUp9E7L2Oq0j..nprfxKPOxR4/aW15nttcspzSvp7dRSshnAVGVVC', '洋洋', '刘洋', 1, '13800000009', 'liuyang@example.com', '测试工程师', 1, '2025-02-10'),
('EP0010', 2, 'chenjing', '$2a$10$EUp9E7L2Oq0j..nprfxKPOxR4/aW15nttcspzSvp7dRSshnAVGVVC', '静静', '陈静', 2, '13800000010', 'chenjing@example.com', 'UI设计师', 1, '2024-11-01'),
('EP0011', 1, 'zhaolei', '$2a$10$EUp9E7L2Oq0j..nprfxKPOxR4/aW15nttcspzSvp7dRSshnAVGVVC', '磊哥', '赵磊', 1, '13800000011', 'zhaolei@example.com', '项目经理', 1, '2023-04-01');

-- ============================================
-- 2. 部门负责人
-- ============================================

update sys_department set leader_id=3 where id=1; -- 技术部 -> Jason Mike
update sys_department set leader_id=7 where id=2; -- 市场部 -> 李娜
update sys_department set leader_id=2 where id=3; -- 后端组 -> 张三
update sys_department set leader_id=6 where id=4; -- 前端组 -> 张伟

-- ============================================
-- 3. 用户角色
-- ============================================

insert into sys_user_role (user_id, role_id) values
(3,1),(3,2),(2,2),(5,3),(6,3),(7,3),(8,3),(9,3),(10,3),(11,2);

-- ============================================
-- 4. 项目
-- ============================================

insert into project (project_name, description, owner_id, status, progress, start_date, end_date) values
('Campus AI Platform', '面向高校的智能问答与知识管理平台，集成 RAG 检索与 AI 助手', 3, 1, 68, '2026-06-01', '2026-08-28'),
('企业知识库系统', '构建企业级 RAG 知识库，支持多格式文档接入与智能检索', 3, 1, 45, '2026-07-01', '2026-09-30'),
('智能会议纪要助手', '基于 ASR 与 LLM 的会议纪要自动生成与待办提取', 2, 1, 82, '2026-05-10', '2026-08-20'),
('移动端协同办公 App', '面向移动端的协同办公应用，支持任务、日程与即时消息', 11, 0, 0, '2026-09-01', '2026-12-31'),
('数据中台建设', '统一数据接入、清洗与指标体系建设', 3, 3, 55, '2026-03-01', '2026-07-31'),
('官网改版', '企业官网全新改版，品牌视觉升级', 7, 2, 100, '2026-02-01', '2026-05-30');

-- ============================================
-- 5. 项目成员
-- ============================================

insert into project_member (project_id, user_id, role_in_project) values
(1,3,'leader'),(1,2,'member'),(1,6,'member'),(1,8,'member'),(1,9,'member'),
(2,3,'leader'),(2,8,'member'),(2,9,'member'),(2,10,'member'),
(3,2,'leader'),(3,6,'member'),(3,8,'member'),(3,9,'member'),
(4,11,'leader'),(4,6,'member'),(4,10,'member'),
(5,3,'leader'),(5,2,'member'),(5,8,'member'),
(6,7,'leader'),(6,10,'member'),(6,9,'member');

-- ============================================
-- 6. 项目任务
-- ============================================

insert into project_task (project_id, title, description, assignee_id, status, due_date) values
(1, '完成项目需求文档', '整理并输出完整的产品需求文档', 3, 1, '2026-08-20'),
(1, 'RAG 检索链路优化', '优化向量检索的召回率与排序效果', 8, 1, '2026-08-22'),
(1, '知识库前端页面开发', '实现知识库的文档管理与检索交互', 6, 1, '2026-08-25'),
(1, 'AI 助手对话接口联调', '对接 Agent 对话接口并完成联调', 8, 2, '2026-08-15'),
(1, '系统集成测试', '完成核心链路的端到端测试', 9, 0, '2026-08-28'),
(1, '部署上线准备', '准备生产环境部署与监控方案', 2, 0, '2026-08-27'),
(2, '文档解析服务开发', '支持 PDF/Word/Markdown 多格式解析', 8, 1, '2026-08-30'),
(2, '知识库分类体系设计', '设计多级分类与标签体系', 3, 2, '2026-08-10'),
(2, '权限管理模块', '实现文档级与分类级权限控制', 8, 0, '2026-09-10'),
(2, '检索结果高亮展示', '前端实现检索命中高亮', 6, 0, '2026-09-15'),
(3, 'ASR 转写服务接入', '接入语音转写服务并优化准确率', 8, 2, '2026-07-30'),
(3, '纪要摘要 Prompt 调优', '优化 LLM 摘要生成质量', 2, 1, '2026-08-12'),
(3, '待办事项自动提取', '从纪要中自动提取待办并指派', 9, 1, '2026-08-18'),
(3, '会议纪要导出功能', '支持导出为 Word/Markdown', 6, 0, '2026-08-20'),
(4, '产品原型设计', '输出核心页面原型', 10, 0, '2026-09-15'),
(4, '技术选型评审', '确定移动端技术栈', 11, 0, '2026-09-20'),
(5, '数据接入管道', '完成核心业务数据接入', 8, 1, '2026-07-20'),
(5, '指标口径梳理', '统一各业务线指标口径', 3, 2, '2026-07-10'),
(5, '数据质量监控', '建设数据质量监控看板', 2, 0, '2026-08-15'),
(6, '首页视觉设计', '完成首页视觉与交互设计', 10, 2, '2026-04-20'),
(6, '官网前端开发', '完成官网页面开发', 6, 2, '2026-05-15'),
(6, '内容迁移与上线', '迁移旧站内容并正式上线', 7, 2, '2026-05-30');

-- ============================================
-- 7. 项目讨论
-- ============================================

insert into project_discussion (project_id, user_id, content, parent_id) values
(1, 3, 'RAG 检索链路优化本周需要重点推进，大家有遇到什么问题吗？', 0),
(1, 8, '目前召回率已经到 85%，但排序效果还有提升空间，正在尝试重排序模型。', 1),
(1, 6, '前端知识库页面已基本完成，正在联调检索接口。', 1),
(1, 9, '集成测试用例已编写完成，等核心链路稳定后开始执行。', 0),
(1, 3, '好的，周五下午做一次整体演示，大家提前准备。', 4);

-- ============================================
-- 8. 会议预约
-- ============================================

insert into meeting_booking (room_id, title, organizer_id, start_time, end_time, status) values
(1, '产品需求评审', 3, '2026-08-16 14:00:00', '2026-08-16 15:00:00', 3),
(2, '团队晨会', 3, '2026-08-16 09:30:00', '2026-08-16 10:00:00', 3),
(5, '周报整理', 3, '2026-08-16 16:30:00', '2026-08-16 17:30:00', 3),
(3, '客户需求沟通', 7, '2026-08-17 10:00:00', '2026-08-17 11:00:00', 1),
(1, '项目同步会议', 3, '2026-08-17 14:00:00', '2026-08-17 15:00:00', 1),
(2, '技术评审会', 2, '2026-08-18 09:30:00', '2026-08-18 11:00:00', 1),
(4, '数据中台评审', 3, '2026-08-14 15:00:00', '2026-08-14 16:00:00', 3),
(1, '官网改版验收', 7, '2026-08-13 10:00:00', '2026-08-13 11:30:00', 3);

-- ============================================
-- 9. 会议参会人
-- ============================================

insert into meeting_participant (booking_id, user_id, status) values
(1,3,1),(1,2,1),(1,8,1),(1,9,1),
(2,3,1),(2,2,1),(2,6,1),
(3,3,1),(3,8,1),
(4,7,1),(4,10,1),(4,3,1),
(5,3,1),(5,2,1),(5,6,1),(5,8,1),(5,9,1),
(6,2,1),(6,8,1),(6,3,1),
(7,3,1),(7,2,1),(7,8,1),
(8,7,1),(8,10,1),(8,9,1);

-- ============================================
-- 10. 知识库文档
-- ============================================

insert into knowledge_doc (title, file_url, file_type, category, uploader_id, process_status, chunk_count) values
('产品需求文档 v2.0', '/uploads/prd-v2.0.pdf', 'pdf', '产品文档', 3, 2, 24),
('技术架构设计文档', '/uploads/architecture.md', 'md', '技术文档', 2, 2, 18),
('员工手册 2026', '/uploads/employee-handbook-2026.pdf', 'pdf', '制度文档', 1, 2, 32),
('项目周报模板', '/uploads/weekly-report-template.docx', 'docx', '模板', 5, 2, 6),
('会议纪要撰写规范', '/uploads/meeting-notes-guide.md', 'md', '规范文档', 3, 2, 10),
('API 接口文档 v1.3', '/uploads/api-docs-v1.3.pdf', 'pdf', '技术文档', 2, 2, 40);

-- ============================================
-- 11. 通知
-- ============================================

insert into sys_notification (user_id, type, title, content, related_id, is_read, created_at) values
(3,'MEETING','会议即将开始','产品需求评审将于 14:00 开始，请准时参加（第一会议室）',1,0,NOW() - INTERVAL 15 MINUTE),
(3,'TASK','新任务分配','你被指派了任务「完成项目需求文档」，截止日期 08/20',1,0,NOW() - INTERVAL 40 MINUTE),
(3,'PROJECT','项目进度更新','项目「Campus AI Platform」进度已更新至 68%',1,0,NOW() - INTERVAL 2 HOUR),
(3,'MEETING','会议即将开始','「项目同步会议」将于明天 14:00 开始',5,0,NOW() - INTERVAL 1 HOUR),
(3,'TASK','任务即将到期','任务「完成项目需求文档」将于 08/20 到期',1,0,NOW() - INTERVAL 3 HOUR),
(3,'MEETING','会议预约成功','你预约的会议「团队晨会」已创建成功',2,1,NOW() - INTERVAL 1 DAY),
(3,'SYSTEM','欢迎使用 Enterprise Pilot','欢迎加入企业智能协作平台，祝你工作愉快',NULL,1,NOW() - INTERVAL 3 DAY),
(2,'TASK','新任务分配','你被指派了任务「数据质量监控」',5,0,NOW() - INTERVAL 3 HOUR),
(5,'MEETING','会议即将开始','产品需求评审将于 14:00 开始（第一会议室）',1,0,NOW() - INTERVAL 15 MINUTE),
(5,'TASK','新任务分配','你被指派了任务「整理会议纪要」',5,0,NOW() - INTERVAL 1 HOUR);

-- ============================================
-- 12. 签到打卡
-- ============================================

insert into attendance_record (user_id, check_in_time, check_out_time, work_date, status) values
(3, '2026-08-14 09:02:00', '2026-08-14 18:30:00', '2026-08-14', 0),
(3, '2026-08-13 08:55:00', '2026-08-13 18:10:00', '2026-08-13', 0),
(2, '2026-08-14 09:15:00', '2026-08-14 18:45:00', '2026-08-14', 1),
(6, '2026-08-14 08:58:00', '2026-08-14 18:20:00', '2026-08-14', 0);
