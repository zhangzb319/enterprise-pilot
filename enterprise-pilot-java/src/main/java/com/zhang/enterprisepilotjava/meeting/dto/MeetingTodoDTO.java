package com.zhang.enterprisepilotjava.meeting.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class MeetingTodoDTO {
    private String content;
    private Long assigneeId;
    private LocalDate dueDate;
}
