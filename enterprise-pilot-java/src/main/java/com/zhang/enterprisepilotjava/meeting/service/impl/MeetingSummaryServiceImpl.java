package com.zhang.enterprisepilotjava.meeting.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.meeting.dto.MeetingSummarySaveDTO;
import com.zhang.enterprisepilotjava.meeting.dto.MeetingTodoDTO;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingBooking;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingSummary;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingTodo;
import com.zhang.enterprisepilotjava.meeting.mapper.MeetingBookingMapper;
import com.zhang.enterprisepilotjava.meeting.mapper.MeetingSummaryMapper;
import com.zhang.enterprisepilotjava.meeting.mapper.MeetingTodoMapper;
import com.zhang.enterprisepilotjava.meeting.service.MeetingSummaryService;
import com.zhang.enterprisepilotjava.meeting.vo.MeetingSummaryVO;
import com.zhang.enterprisepilotjava.meeting.vo.MeetingTodoVO;
import com.zhang.enterprisepilotjava.project.dto.ProjectTaskCreateDTO;
import com.zhang.enterprisepilotjava.project.service.ProjectTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MeetingSummaryServiceImpl implements MeetingSummaryService {

    private final MeetingBookingMapper meetingBookingMapper;
    private final MeetingSummaryMapper meetingSummaryMapper;
    private final MeetingTodoMapper meetingTodoMapper;
    private final ProjectTaskService projectTaskService;

    @Override
    public MeetingSummaryVO getSummaryByBookingId(Long bookingId) {
        MeetingSummary summary = meetingSummaryMapper.selectByBookingId(bookingId);
        if (summary == null) {
            return null;
        }
        MeetingSummaryVO vo = new MeetingSummaryVO();
        BeanUtils.copyProperties(summary, vo);
        List<MeetingTodoVO> todos = meetingTodoMapper.selectBySummaryId(summary.getId());
        vo.setTodos(todos != null ? todos : Collections.emptyList());
        return vo;
    }

    @Override
    @Transactional
    public MeetingSummaryVO saveSummary(Long bookingId, MeetingSummarySaveDTO dto) {
        MeetingBooking booking = meetingBookingMapper.selectById(bookingId);
        if (booking == null) {
            throw new BusinessException("会议预约不存在");
        }

        MeetingSummary summary = meetingSummaryMapper.selectByBookingId(bookingId);
        if (summary == null) {
            summary = new MeetingSummary();
            summary.setBookingId(bookingId);
            summary.setAudioUrl(dto.getAudioUrl());
            summary.setTranscriptText(dto.getTranscriptText());
            summary.setSummaryText(dto.getSummaryText());
            summary.setProcessStatus(3); // 3: 已完成
            meetingSummaryMapper.insert(summary);
        } else {
            summary.setAudioUrl(dto.getAudioUrl());
            summary.setTranscriptText(dto.getTranscriptText());
            summary.setSummaryText(dto.getSummaryText());
            summary.setProcessStatus(3);
            meetingSummaryMapper.updateById(summary);
        }

        // 保存待办项
        if (dto.getTodos() != null && !dto.getTodos().isEmpty()) {
            // 清理旧待办中未完成的或全量刷新
            meetingTodoMapper.delete(new LambdaQueryWrapper<MeetingTodo>()
                    .eq(MeetingTodo::getSummaryId, summary.getId()));

            for (MeetingTodoDTO tDto : dto.getTodos()) {
                if (tDto.getContent() == null || tDto.getContent().isBlank()) continue;
                MeetingTodo todo = new MeetingTodo();
                todo.setSummaryId(summary.getId());
                todo.setContent(tDto.getContent().trim());
                todo.setAssigneeId(tDto.getAssigneeId());
                todo.setDueDate(tDto.getDueDate());
                todo.setStatus(0);
                meetingTodoMapper.insert(todo);
            }
        }

        return getSummaryByBookingId(bookingId);
    }

    @Override
    @Transactional
    public void convertTodoToProjectTask(Long todoId, Long projectId, Long assigneeId) {
        MeetingTodo todo = meetingTodoMapper.selectById(todoId);
        if (todo == null) {
            throw new BusinessException("会议待办不存在");
        }

        Long finalAssignee = assigneeId != null ? assigneeId : todo.getAssigneeId();

        ProjectTaskCreateDTO taskDto = new ProjectTaskCreateDTO();
        taskDto.setTitle(todo.getContent());
        taskDto.setDescription("源自会议纪要待办转入");
        taskDto.setAssigneeId(finalAssignee);
        taskDto.setDueDate(todo.getDueDate());

        projectTaskService.createTask(projectId, taskDto);

        // 标记该待办已处理
        todo.setStatus(1);
        meetingTodoMapper.updateById(todo);
    }
}
