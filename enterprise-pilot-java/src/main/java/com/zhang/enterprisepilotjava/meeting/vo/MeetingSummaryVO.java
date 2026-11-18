package com.zhang.enterprisepilotjava.meeting.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class MeetingSummaryVO {
    private Long id;
    private Long bookingId;
    private String audioUrl;
    private String transcriptText;
    private String summaryText;
    private Integer processStatus;
    private String failReason;
    private LocalDateTime createdAt;
    private List<MeetingTodoVO> todos;
}
