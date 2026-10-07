-- ============================================
-- 为「xiaowang」登录账户 (userId=12, 真实姓名王小文) 填充基础演示数据
-- 说明：脚本幂等，可重复执行。执行前会清理该账户的业务数据再重建，
--       不影响其他用户的数据。
-- 注意：与 seed_xiaowang.sql（针对 userId=14「小王」账号）不是同一个账号，
--       本脚本针对的是登录名为 xiaowang 的账号。
-- 日期基准：2026-09-22（周二），会议/任务时间均安排在此前后。
-- ============================================

use enterprise_pilot;

-- ============================================
-- 0. 清理 xiaowang(12) 相关业务数据（保证可重复执行）
-- ============================================
delete from attendance_record where user_id = 12;
delete from sys_notification where user_id = 12;
delete from knowledge_doc where uploader_id = 12;
delete from meeting_participant where booking_id in (select id from meeting_booking where organizer_id = 12);
delete from meeting_participant where user_id = 12;
delete from meeting_booking where organizer_id = 12;
delete from project_discussion where user_id = 12;
delete from project_task where assignee_id = 12;
delete from project_member where user_id = 12;
delete from project where owner_id = 12;
delete from sys_user_role where user_id = 12;
-- 仅清理本脚本植入的回复私信，保留他人发给 xiaowang 的原始消息
delete from chat_message where sender_id = 12;

-- ============================================
-- 1. 完善用户资料（工号/部门/昵称/岗位/联系方式/入职日期）
-- ============================================
update sys_user
set employee_no = 'EP0012',
    dept_id = 1,
    nickname = '小王',
    gender = 1,
    phone = '13800000012',
    email = 'xiaowang@example.com',
    position = '产品经理',
    hire_date = '2026-09-01'
where id = 12;

-- ============================================
-- 2. 分配角色（普通员工 ROLE_EMPLOYEE）
-- ============================================
insert ignore into sys_user_role (user_id, role_id) values (12, 3);

-- ============================================
-- 3. 新建项目（xiaowang 负责）
-- ============================================
insert into project (project_name, description, owner_id, status, progress, start_date, end_date) values
('智能客服机器人', '基于大模型的企业内部智能客服，覆盖常见问题自动应答与工单流转', 12, 1, 15, '2026-09-01', '2026-12-31');
set @p_new = last_insert_id();

-- ============================================
-- 4. 项目成员：xiaowang 加入现有项目 1/2 + 新项目（leader）
-- ============================================
insert ignore into project_member (project_id, user_id, role_in_project) values
(1, 12, 'member'),
(2, 12, 'member'),
(@p_new, 12, 'leader');

-- ============================================
-- 5. 分配任务给 xiaowang
-- ============================================
insert into project_task (project_id, title, description, assignee_id, status, due_date) values
(1, '整理客服 FAQ 测试用例', '整理高频问题与标准答案，覆盖召回率与排序效果验证场景', 12, 1, '2026-09-25');
set @t_first = last_insert_id();

insert into project_task (project_id, title, description, assignee_id, status, due_date) values
(@p_new, '智能客服需求文档撰写', '梳理客服场景、意图分类与转人工规则，输出 PRD 初稿', 12, 1, '2026-09-26'),
(@p_new, 'FAQ 知识库整理入库', '将确认后的 FAQ 文档上传知识库并完成向量化入库', 12, 0, '2026-09-30'),
(@p_new, '客服机器人竞品调研', '对比主流智能客服产品的功能与交互，输出调研报告', 12, 2, '2026-09-15');

-- ============================================
-- 6. 会议预约（xiaowang 组织，均为近期待开始会议）
-- ============================================
insert into meeting_booking (room_id, title, organizer_id, start_time, end_time, status) values
(1, '智能客服需求评审', 12, '2026-09-23 10:00:00', '2026-09-23 11:00:00', 1);
set @b1 = last_insert_id();

insert into meeting_booking (room_id, title, organizer_id, start_time, end_time, status) values
(2, '客服机器人项目周会', 12, '2026-09-24 14:00:00', '2026-09-24 15:00:00', 1);
set @b2 = last_insert_id();

insert into meeting_booking (room_id, title, organizer_id, start_time, end_time, status) values
(3, '知识库运营沟通会', 12, '2026-09-25 16:00:00', '2026-09-25 17:00:00', 1);
set @b3 = last_insert_id();

-- ============================================
-- 7. 会议参会人
-- ============================================
insert into meeting_participant (booking_id, user_id, status) values
(@b1, 12, 1), (@b1, 3, 1), (@b1, 8, 1),
(@b2, 12, 1), (@b2, 3, 1), (@b2, 6, 1),
(@b3, 12, 1), (@b3, 7, 1), (@b3, 10, 1);

-- ============================================
-- 8. 通知（发给 xiaowang）
-- ============================================
insert into sys_notification (user_id, type, title, content, related_id, is_read, created_at) values
(12, 'MEETING', '会议即将开始', '「智能客服需求评审」将于明天 10:00 开始（第一会议室）', @b1, 0, NOW() - INTERVAL 10 MINUTE),
(12, 'TASK', '新任务分配', '你被指派了任务「整理客服 FAQ 测试用例」，截止日期 09/25', @t_first, 0, NOW() - INTERVAL 1 HOUR),
(12, 'PROJECT', '项目创建成功', '你创建的项目「智能客服机器人」已启动', @p_new, 0, NOW() - INTERVAL 2 HOUR),
(12, 'MEETING', '会议预约成功', '你预约的会议「客服机器人项目周会」已创建成功', @b2, 1, NOW() - INTERVAL 1 DAY),
(12, 'SYSTEM', '欢迎使用 Enterprise Pilot', '欢迎加入企业智能协作平台，祝你工作愉快', NULL, 1, NOW() - INTERVAL 21 DAY);

-- ============================================
-- 9. 签到打卡（近三个工作日）
-- ============================================
insert into attendance_record (user_id, check_in_time, check_out_time, work_date, status) values
(12, '2026-09-18 09:02:00', '2026-09-18 18:20:00', '2026-09-18', 0),
(12, '2026-09-21 09:12:00', '2026-09-21 18:05:00', '2026-09-21', 1),
(12, '2026-09-22 08:57:00', NULL, '2026-09-22', 0);

-- ============================================
-- 10. 知识库文档（xiaowang 上传）
-- ============================================
insert into knowledge_doc (title, file_url, file_type, category, uploader_id, process_status, chunk_count) values
('客服 FAQ 知识库 v1.0', '/uploads/cs-faq-v1.md', 'md', '知识库', 12, 2, 20),
('智能客服产品方案', '/uploads/ai-cs-plan.pdf', 'pdf', '产品文档', 12, 0, 0);

-- ============================================
-- 11. 项目讨论（xiaowang 发言）
-- ============================================
insert into project_discussion (project_id, user_id, content, parent_id) values
(@p_new, 12, '项目正式启动，本周先完成需求文档初稿，欢迎大家补充客服场景。', 0),
(1, 12, '客服场景的 FAQ 整理后我会同步到知识库，检索链路可以直接复用现有方案。', 0);

-- ============================================
-- 12. 站内私信（回复张伟的测试消息 + 修正历史消息时间）
-- ============================================
update chat_message set created_at = NOW() - INTERVAL 2 DAY where sender_id = 6 and receiver_id = 12 and created_at is null;
insert into chat_message (sender_id, receiver_id, content, is_read, created_at) values
(12, 6, '收到，我看完文档后回复你', 0, NOW());
