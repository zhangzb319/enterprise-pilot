package com.zhang.enterprisepilotjava.project.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ProjectCreateDTO {
    @NotBlank(message = "项目名称不能为空")
    private String projectName;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
}

