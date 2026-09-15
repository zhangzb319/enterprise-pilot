package com.zhang.enterprisepilotjava.meeting.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingRoom;
import com.zhang.enterprisepilotjava.meeting.mapper.MeetingRoomMapper;
import com.zhang.enterprisepilotjava.meeting.service.MeetingRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class MeetingRoomServiceImpl extends ServiceImpl<MeetingRoomMapper, MeetingRoom> implements MeetingRoomService {

    private static final String AVAILABLE_ROOMS_CACHE_KEY = "meeting:rooms:available";
    private static final long AVAILABLE_ROOMS_CACHE_TTL_MINUTES = 5;

    private final MeetingRoomMapper meetingRoomMapper;
    private final RedisService redisService;

    @Override
    public List<MeetingRoom> getAvailableRooms() {
        // 优先读缓存
        String cached = redisService.get(AVAILABLE_ROOMS_CACHE_KEY);
        if (cached != null) {
            return redisService.deserializeList(cached, MeetingRoom.class);
        }
        List<MeetingRoom> rooms = this.lambdaQuery()
                .eq(MeetingRoom::getStatus, 1)
                .list();
        redisService.set(AVAILABLE_ROOMS_CACHE_KEY, redisService.serializeList(rooms), AVAILABLE_ROOMS_CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        return rooms;
    }
}
