package com.zhang.enterprisepilotjava.meeting.dto;

import lombok.Data;

import java.util.List;

@Data
public class MeetingSummarySaveDTO {
    private String audioUrl;
    private String transcriptText;
    private String summaryText;
    private List<MeetingTodoDTO> todos;
}
