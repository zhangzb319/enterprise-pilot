package com.zhang.enterprisepilotjava.project.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ProjectTaskCreateDTO {
    @NotBlank(message = "任务标题不能为空")
    private String title;
    private String description;
    private Long assigneeId;
    private LocalDate dueDate;
}

