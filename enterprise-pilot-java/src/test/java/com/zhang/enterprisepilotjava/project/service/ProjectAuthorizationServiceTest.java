package com.zhang.enterprisepilotjava.project.service;

import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.project.entity.Project;
import com.zhang.enterprisepilotjava.project.mapper.ProjectMapper;
import com.zhang.enterprisepilotjava.project.mapper.ProjectMemberMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProjectAuthorizationServiceTest {

    private final ProjectMapper projectMapper = mock(ProjectMapper.class);
    private final ProjectMemberMapper projectMemberMapper = mock(ProjectMemberMapper.class);
    private final RedisService redisService = mock(RedisService.class);
    private final ProjectAuthorizationService service =
            new ProjectAuthorizationService(projectMapper, projectMemberMapper, redisService);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void ownerCanAccessProject() {
        authenticateAs(1L);
        when(projectMapper.selectById(10L)).thenReturn(projectOwnedBy(1L));

        assertDoesNotThrow(() -> service.requireMember(10L));
    }

    @Test
    void memberCanAccessProject() {
        authenticateAs(2L);
        when(projectMapper.selectById(10L)).thenReturn(projectOwnedBy(1L));
        // 实现走 Redis Set:无缓存时查全量成员ID并填充
        when(redisService.exists("project:members:10")).thenReturn(false);
        when(projectMemberMapper.selectUserIdsByProjectId(10L)).thenReturn(List.of(2L, 5L));
        when(redisService.sismember("project:members:10", "2")).thenReturn(true);

        assertDoesNotThrow(() -> service.requireMember(10L));
    }

    @Test
    void nonMemberCannotAccessProject() {
        authenticateAs(3L);
        when(projectMapper.selectById(10L)).thenReturn(projectOwnedBy(1L));
        when(redisService.exists("project:members:10")).thenReturn(true);
        when(redisService.sismember("project:members:10", "3")).thenReturn(false);

        assertThrows(BusinessException.class, () -> service.requireMember(10L));
    }

    private void authenticateAs(Long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, null, List.of()));
    }

    private Project projectOwnedBy(Long ownerId) {
        Project project = new Project();
        project.setOwnerId(ownerId);
        return project;
    }
}
