package com.zhang.enterprisepilotjava.message.controller;

import com.zhang.enterprisepilotjava.common.result.Result;
import com.zhang.enterprisepilotjava.message.dto.SendMessageDTO;
import com.zhang.enterprisepilotjava.message.service.MessageService;
import com.zhang.enterprisepilotjava.message.vo.ConversationVO;
import com.zhang.enterprisepilotjava.message.vo.MessageVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/conversations")
    public Result<List<ConversationVO>> conversations() {
        return Result.success(messageService.listConversations());
    }

    @GetMapping("/with/{userId}")
    public Result<List<MessageVO>> with(@PathVariable Long userId) {
        return Result.success(messageService.listWith(userId));
    }

    @PostMapping("/send")
    public Result<MessageVO> send(@Valid @RequestBody SendMessageDTO dto) {
        return Result.success(messageService.send(dto));
    }

    @GetMapping("/unread-count")
    public Result<Long> unreadCount() {
        return Result.success(messageService.unreadCount());
    }
}