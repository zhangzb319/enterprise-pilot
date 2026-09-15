package com.zhang.enterprisepilotjava.meeting.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingRoom;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface MeetingRoomMapper extends BaseMapper<MeetingRoom> {

    @Select("select * from meeting_room where id = #{id} for update")
    MeetingRoom selectByIdForUpdate(Long id);
}
