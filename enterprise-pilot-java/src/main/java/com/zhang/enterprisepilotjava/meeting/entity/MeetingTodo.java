package com.zhang.enterprisepilotjava.meeting.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("meeting_todo")
public class MeetingTodo {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long summaryId;

    private String content;

    private Long assigneeId;

    private LocalDate dueDate;

    private Integer status; // 0待完成 1已完成

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
