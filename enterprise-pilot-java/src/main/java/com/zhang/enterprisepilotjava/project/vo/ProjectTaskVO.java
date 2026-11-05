package com.zhang.enterprisepilotjava.project.vo;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ProjectTaskVO {
    private Long id;
    private Long projectId;
    private String projectName;
    private String title;
    private String description;
    private Long assigneeId;
    private String assigneeName;
    private Integer status;
    private LocalDate dueDate;
    // 是否指派给当前登录用户,仅在"我的任务"聚合查询中填充
    private Boolean isMine;
}