package com.zhang.enterprisepilotjava.department.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DepartmentDTO {

    @NotBlank(message = "部门名称不能为空")
    private String deptName;

    @NotBlank(message = "上级部门不能为空,顶级部门请传0")
    private Long parentId;

    private Long leaderId;
    private Integer sortOrder;
}
