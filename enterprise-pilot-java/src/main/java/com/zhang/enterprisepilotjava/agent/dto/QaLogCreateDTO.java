package com.zhang.enterprisepilotjava.agent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * AI 助手问答日志上报入参。用户身份取自登录态,不接受客户端传入。
 */
@Data
public class QaLogCreateDTO {

    @NotBlank(message = "问题不能为空")
    @Size(max = 4000, message = "问题过长")
    private String question;

    private String answer;

    /** 引用的知识库文档ID */
    private List<String> referencedDocs;

    /** 本次调用过的工具名 */
    private List<String> tools;

    private Integer latencyMs;

    private Integer promptTokens;

    private Integer completionTokens;
}
