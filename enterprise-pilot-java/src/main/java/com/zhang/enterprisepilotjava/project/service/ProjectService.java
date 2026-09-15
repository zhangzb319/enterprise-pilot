package com.zhang.enterprisepilotjava.project.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.zhang.enterprisepilotjava.project.dto.ProjectCreateDTO;
import com.zhang.enterprisepilotjava.project.entity.Project;
import com.zhang.enterprisepilotjava.project.vo.ProjectVO;

import java.util.List;

public interface ProjectService extends IService<Project> {

    void createProject(ProjectCreateDTO dto);

    List<ProjectVO> getMyProjects();
}
