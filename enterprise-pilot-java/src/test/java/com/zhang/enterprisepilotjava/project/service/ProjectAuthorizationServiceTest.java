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
        when(projectMemberMapper.countByProjectIdAndUserId(10L, 2L)).thenReturn(1);

        assertDoesNotThrow(() -> service.requireMember(10L));
    }

    @Test
    void nonMemberCannotAccessProject() {
        authenticateAs(3L);
        when(projectMapper.selectById(10L)).thenReturn(projectOwnedBy(1L));
        when(projectMemberMapper.countByProjectIdAndUserId(10L, 3L)).thenReturn(0);

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
