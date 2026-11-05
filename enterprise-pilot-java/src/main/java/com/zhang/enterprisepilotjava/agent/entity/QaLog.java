package com.zhang.enterprisepilotjava.agent.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * AI 助手问答日志。每次对话结束由 Python 服务上报,用于审计与效果分析。
 */
@Data
@TableName("qa_log")
public class QaLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String question;

    private String answer;

    /** 引用的知识库文档ID列表,JSON 数组字符串 */
    private String referencedDocs;

    /** 本次对话实际调用过的工具名列表,JSON 数组字符串 */
    private String tools;

    private Integer latencyMs;

    private Integer promptTokens;

    private Integer completionTokens;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
