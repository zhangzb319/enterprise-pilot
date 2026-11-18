package com.zhang.enterprisepilotjava.project.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.util.SecurityUtil;
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

    @Override
    public List<ProjectTaskVO> getMyTasks() {
        // 聚合查询本身已按"项目负责人或项目成员"限定范围,无需再逐个项目鉴权
        return this.baseMapper.selectMyTasks(SecurityUtil.getCurrentUserId());
    }

    @Override
    public void updateTaskStatus(Long projectId, Long taskId, Integer status) {
        projectAuthorizationService.requireMember(projectId);
        ProjectTask task = this.getById(taskId);
        if (task == null || !task.getProjectId().equals(projectId)) {
            throw new BusinessException("任务不存在或不属于该项目");
        }
        if (status == null || status < 0 || status > 2) {
            throw new BusinessException("任务状态不合法");
        }
        task.setStatus(status);
        this.updateById(task);
    }

    @Override
    public void updateTaskStatusDirect(Long taskId, Integer status) {
        ProjectTask task = this.getById(taskId);
        if (task == null) {
            throw new BusinessException("任务不存在");
        }
        projectAuthorizationService.requireMember(task.getProjectId());
        if (status == null || status < 0 || status > 2) {
            throw new BusinessException("任务状态不合法");
        }
        task.setStatus(status);
        this.updateById(task);
    }
}
