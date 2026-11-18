package com.zhang.enterprisepilotjava.meeting.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingSummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface MeetingSummaryMapper extends BaseMapper<MeetingSummary> {

    @Select("SELECT * FROM meeting_summary WHERE booking_id = #{bookingId} LIMIT 1")
    MeetingSummary selectByBookingId(Long bookingId);
}
