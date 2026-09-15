package com.zhang.enterprisepilotjava.meeting.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.util.SecurityUtil;
import com.zhang.enterprisepilotjava.meeting.dto.BookingCreateDTO;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingBooking;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingParticipant;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingRoom;
import com.zhang.enterprisepilotjava.meeting.mapper.MeetingBookingMapper;
import com.zhang.enterprisepilotjava.meeting.mapper.MeetingParticipantMapper;
import com.zhang.enterprisepilotjava.meeting.mapper.MeetingRoomMapper;
import com.zhang.enterprisepilotjava.meeting.service.MeetingBookingService;
import com.zhang.enterprisepilotjava.meeting.vo.BookingVO;
import com.zhang.enterprisepilotjava.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MeetingBookingServiceImpl extends ServiceImpl<MeetingBookingMapper, MeetingBooking> implements MeetingBookingService {

    private final MeetingRoomMapper meetingRoomMapper;
    private final MeetingBookingMapper meetingBookingMapper;
    private final MeetingParticipantMapper meetingParticipantMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public void createBooking(BookingCreateDTO dto) {

        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new BusinessException("结束时间必须晚于开始时间");
        }

        // 事务内锁住会议室
        MeetingRoom room = meetingRoomMapper.selectByIdForUpdate(dto.getRoomId());
        if (room == null || room.getStatus() == 0) {
            throw new BusinessException("会议室不存在或已停用");
        }

        // 拿到锁后做冲突检测
        int conflicts = meetingBookingMapper.countConflicts(
                dto.getRoomId(), dto.getStartTime(), dto.getEndTime());
        if (conflicts > 0) {
            throw new BusinessException("该时间段此会议室已被预约,请选择其它时间");
        }

        // 插入预约记录
        MeetingBooking booking = new MeetingBooking();
        booking.setRoomId(dto.getRoomId());
        booking.setTitle(dto.getTitle());
        booking.setOrganizerId(SecurityUtil.getCurrentUserId());
        booking.setStartTime(dto.getStartTime());
        booking.setEndTime(dto.getEndTime());
        booking.setStatus(1);
        meetingBookingMapper.insert(booking);

        // 组织者自动加入参会人
        MeetingParticipant organizer = new MeetingParticipant();
        organizer.setBookingId(booking.getId());
        organizer.setUserId(booking.getOrganizerId());
        organizer.setStatus(1);
        meetingParticipantMapper.insert(organizer);

        // 发送预约成功通知
        notificationService.send(booking.getOrganizerId(), "MEETING", "会议预约成功",
                "你预约的会议「" + dto.getTitle() + "」已创建成功", booking.getId());
    }

    @Override
    public List<BookingVO> getRoomBookings(Long roomId) {
        return meetingBookingMapper.selectByRoomId(roomId);
    }

    @Override
    public List<BookingVO> getMyBookings() {
        Long userId = SecurityUtil.getCurrentUserId();
        return meetingBookingMapper.selectMyBookings(userId);
    }

    @Override
    @Transactional
    public void cancelBooking(Long bookingId) {
        MeetingBooking booking = meetingBookingMapper.selectById(bookingId);
        if (booking == null) {
            throw new BusinessException("预约记录不存在");
        }

        Long currentUserId = SecurityUtil.getCurrentUserId();
        if (!booking.getOrganizerId().equals(currentUserId)) {
            throw new BusinessException("只有组织者可以取消预约");
        }

        if (booking.getStatus() == 0) {
            throw new BusinessException("该预约已被取消");
        }

        booking.setStatus(0);
        meetingBookingMapper.updateById(booking);
    }
}
