package com.zhang.enterprisepilotjava.project.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.zhang.enterprisepilotjava.project.dto.ProjectTaskCreateDTO;
import com.zhang.enterprisepilotjava.project.entity.ProjectTask;
import com.zhang.enterprisepilotjava.project.vo.ProjectTaskVO;

import java.util.List;

public interface ProjectTaskService extends IService<ProjectTask> {

    void createTask(Long projectId, ProjectTaskCreateDTO dto);

    List<ProjectTaskVO> getTasksByProject(Long projectId);
}
