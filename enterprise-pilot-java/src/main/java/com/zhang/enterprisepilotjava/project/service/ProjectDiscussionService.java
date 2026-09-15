package com.zhang.enterprisepilotjava.project.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.zhang.enterprisepilotjava.project.dto.DiscussionCreateDTO;
import com.zhang.enterprisepilotjava.project.entity.ProjectDiscussion;
import com.zhang.enterprisepilotjava.project.vo.DiscussionTreeVO;

import java.util.List;

public interface ProjectDiscussionService extends IService<ProjectDiscussion> {

    List<DiscussionTreeVO> getDiscussionTree(Long projectId);

    void createDiscussion(Long projectId, DiscussionCreateDTO dto);
}
