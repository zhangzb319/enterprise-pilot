package com.zhang.enterprisepilotjava.meeting.service;

import com.zhang.enterprisepilotjava.meeting.dto.MeetingSummarySaveDTO;
import com.zhang.enterprisepilotjava.meeting.vo.MeetingSummaryVO;

public interface MeetingSummaryService {

    MeetingSummaryVO getSummaryByBookingId(Long bookingId);

    MeetingSummaryVO saveSummary(Long bookingId, MeetingSummarySaveDTO dto);

    void convertTodoToProjectTask(Long todoId, Long projectId, Long assigneeId);
}
