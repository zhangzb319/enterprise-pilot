package com.zhang.enterprisepilotjava.meeting.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhang.enterprisepilotjava.meeting.entity.MeetingTodo;
import com.zhang.enterprisepilotjava.meeting.vo.MeetingTodoVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface MeetingTodoMapper extends BaseMapper<MeetingTodo> {

    @Select("""
        SELECT t.id, t.summary_id, t.content, t.assignee_id, u.real_name AS assignee_name,
               t.due_date, t.status, t.created_at
        FROM meeting_todo t
        LEFT JOIN sys_user u ON t.assignee_id = u.id
        WHERE t.summary_id = #{summaryId}
        ORDER BY t.id ASC
    """)
    List<MeetingTodoVO> selectBySummaryId(Long summaryId);
}
