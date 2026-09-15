package com.zhang.enterprisepilotjava.project.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhang.enterprisepilotjava.project.dto.ProjectTaskCreateDTO;
import com.zhang.enterprisepilotjava.project.entity.ProjectTask;
import com.zhang.enterprisepilotjava.project.mapper.ProjectTaskMapper;
import com.zhang.enterprisepilotjava.project.service.ProjectAuthorizationService;
import com.zhang.enterprisepilotjava.project.service.ProjectTaskService;
import com.zhang.enterprisepilotjava.project.vo.ProjectTaskVO;
import com.zhang.enterprisepilotjava.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectTaskServiceImpl extends ServiceImpl<ProjectTaskMapper, ProjectTask> implements ProjectTaskService {

    private final ProjectAuthorizationService projectAuthorizationService;
    private final NotificationService notificationService;

    @Override
    public void createTask(Long projectId, ProjectTaskCreateDTO dto) {
        projectAuthorizationService.requireMember(projectId);
        ProjectTask task = new ProjectTask();
        BeanUtils.copyProperties(dto, task);
        task.setProjectId(projectId);
        task.setStatus(0);
        this.save(task);

        // 指派了负责人则发送任务通知
        if (task.getAssigneeId() != null) {
            notificationService.send(task.getAssigneeId(), "TASK", "新任务分配",
                    "你被指派了任务「" + dto.getTitle() + "」", task.getId());
        }
    }

    @Override
    public List<ProjectTaskVO> getTasksByProject(Long projectId) {
        projectAuthorizationService.requireMember(projectId);
        return this.baseMapper.selectByProjectId(projectId);
    }
}
