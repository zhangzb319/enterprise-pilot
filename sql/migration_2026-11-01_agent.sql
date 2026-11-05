-- ============================================================
-- 2026-11-01  AI 助手工具化改造
-- qa_log 补齐工具调用与 token 统计字段
--
-- 用法:  mysql -u root -p enterprise_pilot < sql/migration_2026-11-01_agent.sql
-- 说明:  全新安装无需执行本脚本,schema.sql 已包含最新结构。
--        本脚本只执行一次,重复执行会因列已存在而报错。
-- ============================================================

alter table qa_log
    add column tools json comment '本次调用过的工具名列表' after referenced_docs,
    add column latency_ms int comment '整轮对话耗时(毫秒)' after tools,
    add column prompt_tokens int comment '输入 token 数' after latency_ms,
    add column completion_tokens int comment '输出 token 数' after prompt_tokens;
