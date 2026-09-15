-- ============================================
-- enterprise_pilot 数据库建表脚本
-- 说明：按模块分区，从头执行即可完整建库
-- ============================================

create database if not exists enterprise_pilot default charset utf8mb4;
use enterprise_pilot;

-- ============================================
-- 模块一：用户与组织架构
-- ============================================

create table sys_user(
    id bigint primary key auto_increment,
    employee_no varchar(32) unique comment '工号',
    dept_id bigint comment '所属部门，待入职时可为空',
    username varchar(64) unique comment '登录账号',
    password_hash varchar(128) not null comment 'BCrypt加密后的密码',
    nickname varchar(32) comment '昵称',
    real_name varchar(32) not null comment '真实姓名',
    avatar varchar(255) comment '头像URL',
    gender tinyint comment '0未知 1男 2女',
    phone varchar(20) unique comment '手机号码',
    email varchar(64) unique comment '邮箱号码',
    position varchar(64) comment '岗位',
    status tinyint default 1 comment '0待入职 1在职 2离职 3禁用',
    hire_date date comment '入职日期',
    leave_date date comment '离职日期',
    is_deleted tinyint default 0 comment '逻辑删除标记',
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp,
    index idx_dept_id (dept_id)
) engine=InnoDB default charset=utf8mb4 comment='用户表';

create table sys_department(
    id bigint primary key auto_increment,
    dept_name varchar(64) not null comment '部门名称',
    parent_id bigint default 0 comment '上级部门ID，顶级为0',
    leader_id bigint comment '部门负责人ID',
    sort_order int default 0,
    status tinyint default 1 comment '0禁用 1正常',
    is_deleted tinyint default 0,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp,
    index idx_parent_id (parent_id),
    constraint fk_dept_leader foreign key (leader_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='部门表';

create table sys_role(
    id bigint primary key auto_increment,
    role_name varchar(32) not null comment '角色名称',
    role_code varchar(32) unique not null comment '角色标识，如ROLE_ADMIN',
    description varchar(128),
    status tinyint default 1,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 comment='角色表';

create table sys_user_role(
    id bigint primary key auto_increment,
    user_id bigint not null,
    role_id bigint not null,
    unique key uk_user_role (user_id, role_id),
    constraint fk_ur_user foreign key (user_id) references sys_user(id),
    constraint fk_ur_role foreign key (role_id) references sys_role(id)
) engine=InnoDB default charset=utf8mb4 comment='用户角色关联表';

-- ============================================
-- 模块二：会议室预约
-- ============================================

create table meeting_room(
    id bigint primary key auto_increment,
    room_name varchar(64) not null unique comment '会议室名称',
    floor varchar(16),
    capacity int,
    equipment varchar(255),
    status tinyint default 1 comment '0停用/维修中 1正常可用',
    is_deleted tinyint default 0,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 comment='会议室表';

create table meeting_booking(
    id bigint primary key auto_increment,
    room_id bigint not null,
    title varchar(128) not null,
    organizer_id bigint not null,
    start_time datetime not null,
    end_time datetime not null,
    status tinyint default 1 comment '0已取消 1待开始 2进行中 3已结束',
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp,
    index idx_room_time (room_id, start_time, end_time),
    constraint fk_booking_room foreign key (room_id) references meeting_room(id),
    constraint fk_booking_organizer foreign key (organizer_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='会议室预约表';

create table meeting_participant(
    id bigint primary key auto_increment,
    booking_id bigint not null,
    user_id bigint not null,
    status tinyint default 0 comment '0待确认 1已接受 2已拒绝',
    created_at datetime default current_timestamp,
    unique key uk_booking_user (booking_id, user_id),
    constraint fk_participant_booking foreign key (booking_id) references meeting_booking(id),
    constraint fk_participant_user foreign key (user_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='会议参会人关联表';

create table meeting_summary(
    id bigint primary key auto_increment,
    booking_id bigint not null unique comment '关联的预约记录ID，一对一',
    audio_url varchar(255),
    transcript_text longtext comment 'ASR转写文本',
    summary_text text comment 'LLM生成摘要',
    process_status tinyint default 0 comment '0待处理 1转写中 2摘要生成中 3已完成 4失败',
    fail_reason varchar(255),
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp,
    constraint fk_summary_booking foreign key (booking_id) references meeting_booking(id)
) engine=InnoDB default charset=utf8mb4 comment='会议纪要表';

create table meeting_todo(
    id bigint primary key auto_increment,
    summary_id bigint not null,
    content varchar(255) not null,
    assignee_id bigint comment '可为空表示未指派',
    due_date date,
    status tinyint default 0 comment '0待完成 1已完成',
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp,
    constraint fk_todo_summary foreign key (summary_id) references meeting_summary(id),
    constraint fk_todo_assignee foreign key (assignee_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='会议待办事项表';

-- ============================================
-- 模块三：RAG知识库
-- ============================================

create table knowledge_doc(
    id bigint primary key auto_increment,
    title varchar(128) not null,
    file_url varchar(255) not null,
    file_type varchar(16),
    category varchar(64),
    uploader_id bigint not null,
    process_status tinyint default 0 comment '0待处理 1处理中 2已入库 3处理失败',
    chunk_count int default 0,
    fail_reason varchar(255),
    is_deleted tinyint default 0,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp,
    index idx_status (process_status),
    constraint fk_doc_uploader foreign key (uploader_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='知识库文档表';

create table knowledge_chunk(
    id bigint primary key auto_increment,
    doc_id bigint not null,
    chunk_index int not null,
    content text,
    vector_id varchar(64) comment '对应向量库里的ID',
    created_at datetime default current_timestamp,
    index idx_doc_id (doc_id),
    constraint fk_chunk_doc foreign key (doc_id) references knowledge_doc(id)
) engine=InnoDB default charset=utf8mb4 comment='文档分块表';

create table qa_log(
    id bigint primary key auto_increment,
    user_id bigint not null,
    question text not null,
    answer text,
    referenced_docs json comment '引用的文档ID列表',
    created_at datetime default current_timestamp,
    index idx_user_id (user_id),
    constraint fk_qalog_user foreign key (user_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='问答历史记录表';

-- ============================================
-- 模块四：AI Agent
-- ============================================

create table agent_conversation(
    id bigint primary key auto_increment,
    user_id bigint not null,
    title varchar(128) comment '可用首条消息自动生成',
    status tinyint default 1 comment '0已归档 1进行中',
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp,
    index idx_user_id (user_id),
    constraint fk_conv_user foreign key (user_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='Agent会话表';

create table agent_message(
    id bigint primary key auto_increment,
    conversation_id bigint not null,
    role varchar(16) not null comment 'user/assistant/tool',
    content text,
    tool_calls json comment '本条消息触发的工具调用详情',
    tool_result json comment '工具调用返回结果',
    created_at datetime default current_timestamp,
    index idx_conversation_id (conversation_id),
    constraint fk_msg_conv foreign key (conversation_id) references agent_conversation(id)
) engine=InnoDB default charset=utf8mb4 comment='Agent消息表';

-- ============================================
-- 模块五：项目看板
-- ============================================

create table project(
    id bigint primary key auto_increment,
    project_name varchar(128) not null comment '项目名称',
    description text comment '项目描述',
    owner_id bigint not null comment '项目负责人',
    status tinyint default 0 comment '0草稿 1进行中 2已完成 3已延期',
    progress tinyint default 0 comment '进度百分比 0-100',
    start_date date,
    end_date date,
    is_deleted tinyint default 0,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp,
    index idx_owner_id (owner_id),
    constraint fk_project_owner foreign key (owner_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='项目表';

create table project_member(
    id bigint primary key auto_increment,
    project_id bigint not null,
    user_id bigint not null,
    role_in_project varchar(32) default 'member' comment '项目内角色，如leader/member',
    joined_at datetime default current_timestamp,
    unique key uk_project_user (project_id, user_id),
    constraint fk_pm_project foreign key (project_id) references project(id),
    constraint fk_pm_user foreign key (user_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='项目成员关联表';

create table project_task(
    id bigint primary key auto_increment,
    project_id bigint not null,
    title varchar(128) not null,
    description text,
    assignee_id bigint comment '负责人，可为空表示未指派',
    status tinyint default 0 comment '0待开始 1进行中 2已完成',
    due_date date,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp on update current_timestamp,
    index idx_project_id (project_id),
    index idx_assignee_id (assignee_id),
    constraint fk_task_project foreign key (project_id) references project(id),
    constraint fk_task_assignee foreign key (assignee_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='项目任务表';

create table project_discussion(
    id bigint primary key auto_increment,
    project_id bigint not null,
    user_id bigint not null comment '发言人',
    content text not null,
    parent_id bigint default 0 comment '父级评论ID，0表示顶级评论',
    created_at datetime default current_timestamp,
    is_deleted tinyint default 0,
    index idx_project_id (project_id),
    index idx_parent_id (parent_id),
    constraint fk_disc_project foreign key (project_id) references project(id),
    constraint fk_disc_user foreign key (user_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='项目讨论表';

-- ============================================
-- 模块六：签到打卡
-- ============================================

create table attendance_record(
    id bigint primary key auto_increment,
    user_id bigint not null,
    check_in_time datetime comment '签到时间',
    check_out_time datetime comment '签退时间',
    work_date date not null comment '所属日期，便于按天查询',
    status tinyint default 0 comment '0正常 1迟到 2早退 3缺卡',
    created_at datetime default current_timestamp,
    unique key uk_user_date (user_id, work_date),
    constraint fk_att_user foreign key (user_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='签到打卡表';

-- ============================================
-- 模块七：通知中心
-- ============================================

create table sys_notification(
    id bigint primary key auto_increment,
    user_id bigint not null comment '接收人ID',
    type varchar(32) not null comment '通知类型：MEETING/PROJECT/TASK/SYSTEM',
    title varchar(128) not null comment '通知标题',
    content varchar(512) comment '通知内容',
    related_id bigint comment '关联业务ID，如会议/任务ID',
    is_read tinyint default 0 comment '0未读 1已读',
    is_deleted tinyint default 0,
    created_at datetime default current_timestamp,
    index idx_user_read (user_id, is_read),
    constraint fk_notification_user foreign key (user_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='通知表';

-- ============================================
-- 补充外键：sys_user.dept_id -> sys_department.id
-- （放在最后执行，避免建表顺序上的循环依赖问题）
-- ============================================

alter table sys_user
    add constraint fk_user_dept
    foreign key (dept_id) references sys_department(id);

-- ============================================
-- 初始化数据（seed data）：方便本地开发直接有角色数据可用
-- ============================================

insert into sys_role (role_name, role_code, description) values
('管理员', 'ROLE_ADMIN', '系统管理员'),
('部门经理', 'ROLE_MANAGER', '部门负责人'),
('普通员工', 'ROLE_EMPLOYEE', '普通员工账号');

-- ============================================
-- 模块八：站内私信
-- ============================================

create table chat_message(
    id bigint primary key auto_increment,
    sender_id bigint not null comment '发送人ID',
    receiver_id bigint not null comment '接收人ID',
    content varchar(2000) not null comment '消息内容',
    is_read tinyint default 0 comment '0未读 1已读',
    is_deleted tinyint default 0,
    created_at datetime default current_timestamp,
    index idx_sender_receiver (sender_id, receiver_id),
    index idx_receiver_read (receiver_id, is_read),
    constraint fk_msg_sender foreign key (sender_id) references sys_user(id),
    constraint fk_msg_receiver foreign key (receiver_id) references sys_user(id)
) engine=InnoDB default charset=utf8mb4 comment='站内私信表';