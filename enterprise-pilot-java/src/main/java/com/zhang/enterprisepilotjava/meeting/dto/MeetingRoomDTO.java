package com.zhang.enterprisepilotjava.meeting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MeetingRoomDTO {

    @NotBlank(message = "会议室名称不能为空")
    private String roomName;

    private String floor;

    @NotNull(message = "容纳人数不能为空")
    private Integer capacity;

    private String equipment;
}