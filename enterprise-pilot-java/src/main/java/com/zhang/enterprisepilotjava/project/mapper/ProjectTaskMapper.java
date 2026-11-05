package com.zhang.enterprisepilotjava.project.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhang.enterprisepilotjava.project.entity.ProjectTask;
import com.zhang.enterprisepilotjava.project.vo.ProjectTaskVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ProjectTaskMapper extends BaseMapper<ProjectTask> {

    @Select("""
        select t.id, t.project_id, t.title, t.description,
               t.assignee_id, u.real_name as assignee_name,
               t.status, t.due_date
        from project_task t
        left join sys_user u on t.assignee_id = u.id
        where t.project_id = #{projectId}
        order by t.due_date is null, t.due_date
        """)
    List<ProjectTaskVO> selectByProjectId(@Param ("projectId") Long projectId);

    /**
     * 一次查询聚合"我可见项目下的全部任务",避免按项目逐个查询造成的 N+1。
     * is_mine 标记该任务是否指派给当前用户,供上层按需过滤。
     */
    @Select("""
        select t.id, t.project_id, p.project_name,
               t.title, t.description,
               t.assignee_id, u.real_name as assignee_name,
               t.status, t.due_date,
               (t.assignee_id = #{userId}) as is_mine
        from project_task t
        join project p on t.project_id = p.id
        left join sys_user u on t.assignee_id = u.id
        where p.owner_id = #{userId}
           or exists (
               select 1 from project_member m
               where m.project_id = p.id and m.user_id = #{userId}
           )
        order by t.due_date is null, t.due_date, t.id
        """)
    List<ProjectTaskVO> selectMyTasks(@Param("userId") Long userId);
}
