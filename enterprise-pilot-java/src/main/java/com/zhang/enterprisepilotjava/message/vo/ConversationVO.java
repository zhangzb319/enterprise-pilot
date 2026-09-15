package com.zhang.enterprisepilotjava.message.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 会话列表中的单一会话
 */
@Data
public class ConversationVO {
    private Long userId;
    private String name;
    private String avatar;
    private String position;
    private String deptName;
    private String lastMessage;
    private LocalDateTime lastTime;
    private Long unreadCount;
}