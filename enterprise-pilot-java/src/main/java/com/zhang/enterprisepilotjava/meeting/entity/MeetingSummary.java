package com.zhang.enterprisepilotjava.meeting.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("meeting_summary")
public class MeetingSummary {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long bookingId;

    private String audioUrl;

    private String transcriptText;

    private String summaryText;

    private Integer processStatus; // 0待处理 1转写中 2摘要生成中 3已完成 4失败

    private String failReason;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
