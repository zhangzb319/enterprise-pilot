package com.zhang.enterprisepilotjava.project.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.common.util.SecurityUtil;
import com.zhang.enterprisepilotjava.project.dto.ProjectCreateDTO;
import com.zhang.enterprisepilotjava.project.entity.Project;
import com.zhang.enterprisepilotjava.project.entity.ProjectMember;
import com.zhang.enterprisepilotjava.project.mapper.ProjectMapper;
import com.zhang.enterprisepilotjava.project.mapper.ProjectMemberMapper;
import com.zhang.enterprisepilotjava.project.service.ProjectService;
import com.zhang.enterprisepilotjava.project.vo.ProjectVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl extends ServiceImpl<ProjectMapper, Project> implements ProjectService {

    private static final String MEMBER_CACHE_PREFIX = "project:members:";
    private static final String MY_PROJECTS_CACHE_PREFIX = "project:my:";
    private static final long MY_PROJECTS_CACHE_TTL_MINUTES = 3;

    private final ProjectMemberMapper projectMemberMapper;
    private final RedisService redisService;

    @Override
    @Transactional
    public void createProject(ProjectCreateDTO dto) {
        Long userId = SecurityUtil.getCurrentUserId();

        Project project = new Project();
        BeanUtils.copyProperties(dto, project);
        project.setOwnerId(userId);
        project.setStatus(0);
        project.setProgress(0);
        this.save(project);

        // 项目创建者自动成为项目成员,作为leader
        ProjectMember owner = new ProjectMember();
        owner.setProjectId(project.getId());
        owner.setUserId(userId);
        owner.setRoleInProject("leader");
        projectMemberMapper.insert(owner);

        // 写入成员缓存并失效我的项目列表缓存
        redisService.sadd(MEMBER_CACHE_PREFIX + project.getId(), String.valueOf(userId));
        redisService.delete(MY_PROJECTS_CACHE_PREFIX + userId);
    }

    @Override
    public List<ProjectVO> getMyProjects() {
        Long userId = SecurityUtil.getCurrentUserId();
        String cacheKey = MY_PROJECTS_CACHE_PREFIX + userId;
        String cached = redisService.get(cacheKey);
        if (cached != null) {
            return redisService.deserializeList(cached, ProjectVO.class);
        }
        List<ProjectVO> projects = this.baseMapper.selectMyProjects(userId);
        redisService.set(cacheKey, redisService.serializeList(projects), MY_PROJECTS_CACHE_TTL_MINUTES, java.util.concurrent.TimeUnit.MINUTES);
        return projects;
    }
}
