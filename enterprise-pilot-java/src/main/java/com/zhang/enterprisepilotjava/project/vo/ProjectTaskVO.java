package com.zhang.enterprisepilotjava.project.vo;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ProjectTaskVO {
    private Long id;
    private Long projectId;
    private String title;
    private String description;
    private Long assigneeId;
    private String assigneeName;
    private Integer status;
    private LocalDate dueDate;
}