package com.zhang.enterprisepilotjava.meeting.controller;

import com.zhang.enterprisepilotjava.common.result.Result;
import com.zhang.enterprisepilotjava.meeting.dto.MeetingSummarySaveDTO;
import com.zhang.enterprisepilotjava.meeting.service.MeetingSummaryService;
import com.zhang.enterprisepilotjava.meeting.vo.MeetingSummaryVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/meeting")
@RequiredArgsConstructor
public class MeetingSummaryController {

    private final MeetingSummaryService meetingSummaryService;

    @GetMapping("/bookings/{bookingId}/summary")
    public Result<MeetingSummaryVO> getSummary(@PathVariable Long bookingId) {
        return Result.success(meetingSummaryService.getSummaryByBookingId(bookingId));
    }

    @PostMapping("/bookings/{bookingId}/summary")
    public Result<MeetingSummaryVO> saveSummary(
            @PathVariable Long bookingId,
            @RequestBody MeetingSummarySaveDTO dto) {
        return Result.success(meetingSummaryService.saveSummary(bookingId, dto));
    }

    @PostMapping("/todos/{todoId}/convert-to-task")
    public Result<Void> convertToTask(
            @PathVariable Long todoId,
            @RequestParam Long projectId,
            @RequestParam(required = false) Long assigneeId) {
        meetingSummaryService.convertTodoToProjectTask(todoId, projectId, assigneeId);
        return Result.success();
    }
}
