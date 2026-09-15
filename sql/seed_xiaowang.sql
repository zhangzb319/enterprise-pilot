-- ============================================
-- 为「小王」(userId=14) 增量填充演示数据
-- 说明：脚本幂等，可重复执行。执行前会清理小王相关数据再重建，
--       不影响其他用户的数据。
-- ============================================

use enterprise_pilot;

-- ============================================
-- 0. 清理小王相关数据（保证可重复执行）
-- ============================================
delete from attendance_record where user_id = 14;
delete from sys_notification where user_id = 14;
delete from knowledge_doc where uploader_id = 14;
delete from meeting_participant where booking_id in (select id from meeting_booking where organizer_id = 14);
delete from meeting_participant where user_id = 14;
delete from meeting_booking where organizer_id = 14;
delete from project_task where assignee_id = 14;
delete from project_member where user_id = 14;
delete from project where owner_id = 14;
delete from sys_user_role where user_id = 14;

-- ============================================
-- 1. 完善用户信息
-- ============================================
update sys_user
set employee_no = 'EP0014',
    dept_id = 1,
    nickname = '小王',
    position = '产品经理',
    hire_date = '2026-08-01'
where id = 14;

-- ============================================
-- 2. 分配角色（普通员工）
-- ============================================
insert ignore into sys_user_role (user_id, role_id) values (14, 3);

-- ============================================
-- 3. 新建项目（小王负责）
-- ============================================
insert into project (project_name, description, owner_id, status, progress, start_date, end_date) values
('数据分析看板', '面向管理层的数据分析看板，汇总核心业务指标并支持下钻分析', 14, 1, 30, '2026-08-01', '2026-10-31');
set @p_new = last_insert_id();

-- ============================================
-- 4. 项目成员：小王加入现有项目 1/2 + 新项目
-- ============================================
insert ignore into project_member (project_id, user_id, role_in_project) values
(1, 14, 'member'),
(2, 14, 'member'),
(@p_new, 14, 'leader');

-- ============================================
-- 5. 分配任务给小王
-- ============================================
insert into project_task (project_id, title, description, assignee_id, status, due_date) values
(1, '整理 RAG 检索测试用例', '覆盖召回率与排序效果的测试用例整理', 14, 1, '2026-08-22'),
(1, '知识库文档质量检查', '检查已入库文档的格式与内容质量', 14, 0, '2026-08-26'),
(@p_new, '数据看板需求梳理', '与业务方确认核心指标与展示维度', 14, 1, '2026-08-20'),
(@p_new, '数据接口对接', '对接数据中台接口并完成联调', 14, 0, '2026-09-10');

-- ============================================
-- 6. 会议预约（小王组织）
-- ============================================
insert into meeting_booking (room_id, title, organizer_id, start_time, end_time, status) values
(2, '周会复盘', 14, '2026-08-17 15:00:00', '2026-08-17 16:00:00', 1);
set @b1 = last_insert_id();

insert into meeting_booking (room_id, title, organizer_id, start_time, end_time, status) values
(1, '产品需求评审', 14, '2026-08-18 10:00:00', '2026-08-18 11:00:00', 1);
set @b2 = last_insert_id();

insert into meeting_booking (room_id, title, organizer_id, start_time, end_time, status) values
(3, '新人入职培训', 14, '2026-08-19 14:00:00', '2026-08-19 15:00:00', 1);
set @b3 = last_insert_id();

-- ============================================
-- 7. 会议参会人
-- ============================================
insert into meeting_participant (booking_id, user_id, status) values
(@b1, 14, 1), (@b1, 3, 1), (@b1, 8, 1),
(@b2, 14, 1), (@b2, 3, 1), (@b2, 8, 1),
(@b3, 14, 1), (@b3, 6, 1), (@b3, 10, 1);

-- ============================================
-- 8. 通知（发给小王）
-- ============================================
insert into sys_notification (user_id, type, title, content, related_id, is_read, created_at) values
(14, 'MEETING', '会议即将开始', '「周会复盘」将于今天 15:00 开始（第二会议室）', @b1, 0, NOW() - INTERVAL 10 MINUTE),
(14, 'MEETING', '会议即将开始', '「产品需求评审」将于明天 10:00 开始（第一会议室）', @b2, 0, NOW() - INTERVAL 30 MINUTE),
(14, 'TASK', '新任务分配', '你被指派了任务「整理 RAG 检索测试用例」，截止日期 08/22', 1, 0, NOW() - INTERVAL 1 HOUR),
(14, 'PROJECT', '项目创建成功', '你创建的项目「数据分析看板」已启动', @p_new, 0, NOW() - INTERVAL 2 HOUR),
(14, 'SYSTEM', '欢迎使用 Enterprise Pilot', '欢迎加入企业智能协作平台，祝你工作愉快', NULL, 0, NOW() - INTERVAL 1 DAY);

-- ============================================
-- 9. 签到打卡
-- ============================================
insert into attendance_record (user_id, check_in_time, check_out_time, work_date, status) values
(14, '2026-08-14 09:05:00', '2026-08-14 18:30:00', '2026-08-14', 0),
(14, '2026-08-17 08:58:00', '2026-08-17 18:15:00', '2026-08-17', 0);

-- ============================================
-- 10. 知识库文档（小王上传）
-- ============================================
insert into knowledge_doc (title, file_url, file_type, category, uploader_id, process_status, chunk_count) values
('产品运营手册', '/uploads/product-ops-guide.pdf', 'pdf', '产品文档', 14, 2, 15),
('数据分析规范', '/uploads/data-analysis-guide.md', 'md', '规范文档', 14, 2, 12);
