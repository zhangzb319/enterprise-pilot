package com.zhang.enterprisepilotjava.meeting.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.zhang.enterprisepilotjava.meeting.dto.BookingCreateDTO;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingBooking;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingRoom;
import com.zhang.enterprisepilotjava.meeting.vo.BookingVO;

import java.util.List;

public interface MeetingBookingService extends IService<MeetingBooking> {

    void createBooking(BookingCreateDTO dto);

    List<BookingVO> getRoomBookings(Long roomId);

    List<BookingVO> getMyBookings();

    void cancelBooking(Long bookingId);
}
