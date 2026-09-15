package com.zhang.enterprisepilotjava.project.controller;

import com.zhang.enterprisepilotjava.common.result.Result;
import com.zhang.enterprisepilotjava.project.dto.DiscussionCreateDTO;
import com.zhang.enterprisepilotjava.project.dto.ProjectCreateDTO;
import com.zhang.enterprisepilotjava.project.dto.ProjectTaskCreateDTO;
import com.zhang.enterprisepilotjava.project.service.ProjectDiscussionService;
import com.zhang.enterprisepilotjava.project.service.ProjectService;
import com.zhang.enterprisepilotjava.project.service.ProjectTaskService;
import com.zhang.enterprisepilotjava.project.vo.DiscussionTreeVO;
import com.zhang.enterprisepilotjava.project.vo.ProjectTaskVO;
import com.zhang.enterprisepilotjava.project.vo.ProjectVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectDiscussionService projectDiscussionService;
    private final ProjectService projectService;
    private final ProjectTaskService projectTaskService;

    @PostMapping
    public Result<Void> create(@RequestBody @Valid ProjectCreateDTO dto) {
        projectService.createProject(dto);
        return Result.success();
    }

    @GetMapping("/my")
    public Result<List<ProjectVO>> myProject() {
        return Result.success(projectService.getMyProjects());
    }

    @PostMapping("/{projectId}/tasks")
    public Result<Void> createTask(@PathVariable Long projectId, @RequestBody @Valid ProjectTaskCreateDTO dto) {
        projectTaskService.createTask(projectId, dto);
        return Result.success();
    }

    @GetMapping("/{projectId}/tasks")
    public Result<List<ProjectTaskVO>> listTasks(@PathVariable Long projectId) {
        return Result.success(projectTaskService.getTasksByProject(projectId));
    }

    @PostMapping("/{projectId}/discussions")
    public Result<Void> createDiscussion(@PathVariable Long projectId, @RequestBody @Valid DiscussionCreateDTO dto) {
        projectDiscussionService.createDiscussion(projectId, dto);
        return Result.success();
    }

    @GetMapping("/{projectId}/discussion/tree")
    public Result<List<DiscussionTreeVO>> discussionTree(@PathVariable Long projectId) {
        return Result.success(projectDiscussionService.getDiscussionTree(projectId));
    }
}
