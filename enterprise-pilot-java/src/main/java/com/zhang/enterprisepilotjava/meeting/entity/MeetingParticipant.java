package com.zhang.enterprisepilotjava.meeting.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("meeting_participant")
public class MeetingParticipant {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long bookingId;
    private Long userId;
    private Integer status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
