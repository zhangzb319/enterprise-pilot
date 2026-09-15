package com.zhang.enterprisepilotjava.project.vo;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ProjectVO {
    private Long id;
    private String projectName;
    private String description;
    private Long ownerId;
    private String ownerName;
    private Integer status;
    private Integer progress;
    private LocalDate startDate;
    private LocalDate endDate;
}
