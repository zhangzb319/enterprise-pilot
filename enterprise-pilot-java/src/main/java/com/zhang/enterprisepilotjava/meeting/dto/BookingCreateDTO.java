package com.zhang.enterprisepilotjava.meeting.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookingCreateDTO {

    @NotNull(message = "会议室不能为空")
    private Long roomId;

    @NotBlank(message = "会议主题不能为空")
    private String title;

    @NotNull(message = "开始时间不能为空")
    @Future(message = "开始时间必须晚于当前时间")
    private LocalDateTime startTime;

    @NotNull(message = "结束时间不能为空")
    @Future(message = "结束时间必须晚于当前时间")
    private LocalDateTime endTime;
}
