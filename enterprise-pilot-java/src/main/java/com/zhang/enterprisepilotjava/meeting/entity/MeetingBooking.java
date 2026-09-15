package com.zhang.enterprisepilotjava.meeting.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("meeting_booking")
public class MeetingBooking {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long roomId;
    private String title;
    private Long organizerId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}