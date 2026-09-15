package com.zhang.enterprisepilotjava.project.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhang.enterprisepilotjava.project.entity.ProjectMember;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ProjectMemberMapper extends BaseMapper<ProjectMember> {

    @Select("select count(*) from project_member where project_id = #{projectId} and user_id = #{userId}")
    int countByProjectIdAndUserId(@Param("projectId") Long projectId, @Param("userId") Long userId);

    @Select("select user_id from project_member where project_id = #{projectId}")
    List<Long> selectUserIdsByProjectId(@Param("projectId") Long projectId);
}
