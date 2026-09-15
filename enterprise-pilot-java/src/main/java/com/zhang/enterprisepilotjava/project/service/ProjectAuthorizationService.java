package com.zhang.enterprisepilotjava.project.service;

import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.result.ResultCode;
import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.common.util.SecurityUtil;
import com.zhang.enterprisepilotjava.project.entity.Project;
import com.zhang.enterprisepilotjava.project.mapper.ProjectMapper;
import com.zhang.enterprisepilotjava.project.mapper.ProjectMemberMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectAuthorizationService {

    private static final String MEMBER_CACHE_PREFIX = "project:members:";

    private final ProjectMapper projectMapper;
    private final ProjectMemberMapper projectMemberMapper;
    private final RedisService redisService;

    public void requireMember(Long projectId) {
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        Long userId = SecurityUtil.getCurrentUserId();
        if (userId.equals(project.getOwnerId())) {
            return;
        }
        // 优先用Redis Set判断,无缓存时查DB并填充
        String cacheKey = MEMBER_CACHE_PREFIX + projectId;
        if (!redisService.exists(cacheKey)) {
            List<Long> memberIds = projectMemberMapper.selectUserIdsByProjectId(projectId);
            redisService.sadd(cacheKey, memberIds.stream().map(String::valueOf).toArray(String[]::new));
        }
        if (!redisService.sismember(cacheKey, String.valueOf(userId))) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }
    }
}
