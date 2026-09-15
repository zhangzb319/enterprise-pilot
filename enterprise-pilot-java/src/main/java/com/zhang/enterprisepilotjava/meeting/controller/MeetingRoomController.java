package com.zhang.enterprisepilotjava.meeting.controller;

import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.result.Result;
import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.meeting.dto.MeetingRoomDTO;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingRoom;
import com.zhang.enterprisepilotjava.meeting.service.MeetingRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meeting/rooms")
@RequiredArgsConstructor
public class MeetingRoomController {

    private static final String AVAILABLE_ROOMS_CACHE_KEY = "meeting:rooms:available";

    private final MeetingRoomService meetingRoomService;
    private final RedisService redisService;

    @GetMapping
    public Result<List<MeetingRoom>> list() {
        return Result.success(meetingRoomService.getAvailableRooms());
    }

    @GetMapping("/all")
    public Result<List<MeetingRoom>> all() {
        return Result.success(meetingRoomService.list());
    }

    @PostMapping
    public Result<Void> create(@RequestBody @Valid MeetingRoomDTO dto) {
        MeetingRoom room = new MeetingRoom();
        BeanUtils.copyProperties(dto, room);
        room.setStatus(1);
        meetingRoomService.save(room);
        redisService.delete(AVAILABLE_ROOMS_CACHE_KEY);
        return Result.success();
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody @Valid MeetingRoomDTO dto) {
        MeetingRoom room = requireRoom(id);
        BeanUtils.copyProperties(dto, room);
        meetingRoomService.updateById(room);
        redisService.delete(AVAILABLE_ROOMS_CACHE_KEY);
        return Result.success();
    }

    @PutMapping("/{id}/disable")
    public Result<Void> disable(@PathVariable Long id) {
        MeetingRoom room = requireRoom(id);
        room.setStatus(0);
        meetingRoomService.updateById(room);
        redisService.delete(AVAILABLE_ROOMS_CACHE_KEY);
        return Result.success();
    }

    private MeetingRoom requireRoom(Long id) {
        MeetingRoom room = meetingRoomService.getById(id);
        if (room == null) {
            throw new BusinessException("会议室不存在");
        }
        return room;
    }
}
