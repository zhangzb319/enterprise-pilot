package com.zhang.enterprisepilotjava.meeting.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookingVO {
    private Long id;
    private String title;
    private Long roomId;
    private String roomName;
    private Long organizerId;
    private String organizerName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer status;
}