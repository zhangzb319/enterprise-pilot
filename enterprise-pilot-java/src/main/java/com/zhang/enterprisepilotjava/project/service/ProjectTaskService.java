package com.zhang.enterprisepilotjava.project.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.zhang.enterprisepilotjava.project.dto.ProjectTaskCreateDTO;
import com.zhang.enterprisepilotjava.project.entity.ProjectTask;
import com.zhang.enterprisepilotjava.project.vo.ProjectTaskVO;

import java.util.List;

public interface ProjectTaskService extends IService<ProjectTask> {

    void createTask(Long projectId, ProjectTaskCreateDTO dto);

    List<ProjectTaskVO> getTasksByProject(Long projectId);

    /**
     * 我可见项目下的全部任务(含 projectName 与 isMine 标记)。
     */
    List<ProjectTaskVO> getMyTasks();

    /**
     * 更新任务状态(0待开始 1进行中 2已完成)
     */
    void updateTaskStatus(Long projectId, Long taskId, Integer status);

    /**
     * 直接按任务 ID 更新状态(内部鉴权是否属于当前用户项目)
     */
    void updateTaskStatusDirect(Long taskId, Integer status);
}
