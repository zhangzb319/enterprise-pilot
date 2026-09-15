package com.zhang.enterprisepilotjava.project.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhang.enterprisepilotjava.project.entity.Project;
import com.zhang.enterprisepilotjava.project.vo.ProjectVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ProjectMapper extends BaseMapper<Project> {

    @Select("""
        select distinct p.id, p.project_name, p.description,
               p.owner_id, u.real_name as owner_name,
               p.status, p.progress, p.start_date, p.end_date,
               p.created_at
        from project p
        join sys_user u on p.owner_id = u.id
        left join project_member m on m.project_id = p.id
        where p.owner_id = #{userId} or m.user_id = #{userId}
        order by p.created_at desc
        """)
    List<ProjectVO> selectMyProjects(@Param("userId") Long userId);
}
