package com.zhang.enterprisepilotjava.meeting.controller;

import com.zhang.enterprisepilotjava.common.result.Result;
import com.zhang.enterprisepilotjava.meeting.dto.BookingCreateDTO;
import com.zhang.enterprisepilotjava.meeting.service.MeetingBookingService;
import com.zhang.enterprisepilotjava.meeting.vo.BookingVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meeting/bookings")
@RequiredArgsConstructor
public class MeetingBookingController {

    private final MeetingBookingService meetingBookingService;

    @PostMapping
    public Result<Void> create(@RequestBody @Valid BookingCreateDTO dto) {
        meetingBookingService.createBooking(dto);
        return Result.success();
    }

    @GetMapping("/room/{roomId}")
    public Result<List<BookingVO>> getRoomBookings(@PathVariable Long roomId) {
        return Result.success(meetingBookingService.getRoomBookings(roomId));
    }

    @GetMapping("/my")
    public Result<List<BookingVO>> getMyBookings() {
        return Result.success(meetingBookingService.getMyBookings());
    }

    @PutMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable Long id) {
        meetingBookingService.cancelBooking(id);
        return Result.success();
    }
}
