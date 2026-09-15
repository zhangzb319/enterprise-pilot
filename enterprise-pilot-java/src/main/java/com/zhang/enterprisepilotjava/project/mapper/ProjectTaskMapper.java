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
}
