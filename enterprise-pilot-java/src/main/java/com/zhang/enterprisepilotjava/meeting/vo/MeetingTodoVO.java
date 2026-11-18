package com.zhang.enterprisepilotjava.meeting.vo;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class MeetingTodoVO {
    private Long id;
    private Long summaryId;
    private String content;
    private Long assigneeId;
    private String assigneeName;
    private LocalDate dueDate;
    private Integer status; // 0待完成 1已完成
    private LocalDateTime createdAt;
}
