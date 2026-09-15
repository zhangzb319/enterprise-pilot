package com.zhang.enterprisepilotjava.meeting.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingBooking;
import com.zhang.enterprisepilotjava.meeting.vo.BookingVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface MeetingBookingMapper extends BaseMapper<MeetingBooking> {

    @Select("""
            select count(*) from meeting_booking
            where room_id = #{roomId}
              and status != 0
              and not(end_time <= #{startTime} or start_time >= #{endTime})
            """)
    int countConflicts(@Param("roomId") Long roomId,
                       @Param("startTime") LocalDateTime startTime,
                       @Param("endTime") LocalDateTime endTime);

    @Select("""
        select b.id, b.title, b.room_id, r.room_name,
               b.organizer_id, u.real_name as organizer_name,
               b.start_time, b.end_time, b.status
        from meeting_booking b
        join meeting_room r on b.room_id = r.id
        join sys_user u on b.organizer_id = u.id
        where b.room_id = #{roomId}
        order by b.start_time
        """)
    List<BookingVO> selectByRoomId(@Param("roomId") Long roomId);

    @Select("""
            select distinct b.id, b.title, b.room_id, r.room_name,
                   b.organizer_id, u.real_name as organizer_name,
                   b.start_time, b.end_time, b.status
            from meeting_booking b
            join meeting_room r on b.room_id = r.id
            join sys_user u on b.organizer_id = u.id
            left join meeting_participant p on p.booking_id = b.id
            where b.organizer_id = #{userId} or p.user_id = #{userId}
            order by b.start_time desc
            """)
    List<BookingVO> selectMyBookings(@Param("userId")Long userId);
}
