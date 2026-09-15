package com.zhang.enterprisepilotjava.project.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.result.ResultCode;
import com.zhang.enterprisepilotjava.common.util.SecurityUtil;
import com.zhang.enterprisepilotjava.project.dto.DiscussionCreateDTO;
import com.zhang.enterprisepilotjava.project.entity.ProjectDiscussion;
import com.zhang.enterprisepilotjava.project.mapper.ProjectDiscussionMapper;
import com.zhang.enterprisepilotjava.project.service.ProjectAuthorizationService;
import com.zhang.enterprisepilotjava.project.service.ProjectDiscussionService;
import com.zhang.enterprisepilotjava.project.vo.DiscussionTreeVO;
import com.zhang.enterprisepilotjava.user.entity.User;
import com.zhang.enterprisepilotjava.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectDiscussionServiceImpl extends ServiceImpl<ProjectDiscussionMapper, ProjectDiscussion> implements ProjectDiscussionService {

    private final UserService userService;
    private final ProjectAuthorizationService projectAuthorizationService;

    @Override
    public List<DiscussionTreeVO> getDiscussionTree(Long projectId) {
        projectAuthorizationService.requireMember(projectId);
        List<ProjectDiscussion> discussions = this.lambdaQuery()
                .eq(ProjectDiscussion::getProjectId, projectId)
                .list();
        Set<Long> userIds = discussions.stream().map(ProjectDiscussion::getUserId).collect(Collectors.toSet());
        Map<Long, String> userNames = userIds.isEmpty()
                ? Map.of()
                : userService.listByIds(userIds).stream()
                        .collect(Collectors.toMap(User::getId, User::getRealName));
        Map<Long, List<DiscussionTreeVO>> byParentId = discussions.stream().map(discussion -> {
            DiscussionTreeVO vo = new DiscussionTreeVO();
            BeanUtils.copyProperties(discussion, vo);
            vo.setUserName(userNames.getOrDefault(discussion.getUserId(), "已删除用户"));
            return vo;
        }).collect(Collectors.groupingBy(DiscussionTreeVO::getParentId));
        return buildChildren(0L, byParentId);
    }

    private List<DiscussionTreeVO> buildChildren(Long parentId, Map<Long, List<DiscussionTreeVO>> byParentId) {
        List<DiscussionTreeVO> children = byParentId.getOrDefault(parentId, new ArrayList<>());
        for (DiscussionTreeVO child : children) {
            child.setChildren(buildChildren(child.getId(), byParentId));
        }
        return children;
    }

    @Override
    public void createDiscussion(Long projectId, DiscussionCreateDTO dto) {
        projectAuthorizationService.requireMember(projectId);
        if (dto.getParentId() != null && dto.getParentId() != 0) {
            ProjectDiscussion parent = this.getById(dto.getParentId());
            if (parent == null || !projectId.equals(parent.getProjectId())) {
                throw new BusinessException(ResultCode.NOT_FOUND);
            }
        }
        ProjectDiscussion discussion = new ProjectDiscussion();
        BeanUtils.copyProperties(dto, discussion);
        discussion.setProjectId(projectId);
        discussion.setUserId(SecurityUtil.getCurrentUserId());
        this.save(discussion);
    }
}
