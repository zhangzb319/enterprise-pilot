package com.zhang.enterprisepilotjava.agent.service;

import com.zhang.enterprisepilotjava.agent.dto.QaLogCreateDTO;
import com.zhang.enterprisepilotjava.agent.entity.QaLog;
import com.zhang.enterprisepilotjava.agent.mapper.QaLogMapper;
import com.zhang.enterprisepilotjava.common.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentLogService {

    /** TEXT 列上限 64KB,留出余量截断,避免超长回答导致插入失败 */
    private static final int MAX_ANSWER_LENGTH = 8000;

    private final QaLogMapper qaLogMapper;
    // 项目运行在 Spring Boot 4 / Jackson 3,自动配置的 Bean 是 tools.jackson.databind.json.JsonMapper
    private final ObjectMapper objectMapper;

    /**
     * 记录一次问答。日志属于旁路能力,任何异常都只告警不抛出,
     * 不允许因为写日志失败而影响对话本身。
     */
    public void record(QaLogCreateDTO dto) {
        try {
            QaLog entity = new QaLog();
            entity.setUserId(SecurityUtil.getCurrentUserId());
            entity.setQuestion(dto.getQuestion());
            entity.setAnswer(truncate(dto.getAnswer(), MAX_ANSWER_LENGTH));
            entity.setReferencedDocs(toJson(dto.getReferencedDocs()));
            entity.setTools(toJson(dto.getTools()));
            entity.setLatencyMs(dto.getLatencyMs());
            entity.setPromptTokens(dto.getPromptTokens());
            entity.setCompletionTokens(dto.getCompletionTokens());
            qaLogMapper.insert(entity);
        } catch (Exception e) {
            log.warn("写入问答日志失败,已忽略: {}", e.getMessage());
        }
    }

    private String toJson(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return objectMapper.writeValueAsString(values);
    }

    private String truncate(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength);
    }
}
