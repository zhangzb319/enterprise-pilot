package com.zhang.enterprisepilotjava.agent.controller;

import com.zhang.enterprisepilotjava.agent.dto.QaLogCreateDTO;
import com.zhang.enterprisepilotjava.agent.service.AgentLogService;
import com.zhang.enterprisepilotjava.common.result.Result;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentLogController {

    private final AgentLogService agentLogService;

    /**
     * 由 Python AI 服务在对话结束后回调上报,写入 qa_log。
     */
    @PostMapping("/log")
    public Result<Void> log(@RequestBody @Valid QaLogCreateDTO dto) {
        agentLogService.record(dto);
        return Result.success();
    }
}
