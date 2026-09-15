package com.zhang.enterprisepilotjava.meeting.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingRoom;

import java.util.List;

public interface MeetingRoomService extends IService<MeetingRoom> {

    List<MeetingRoom> getAvailableRooms();
}
