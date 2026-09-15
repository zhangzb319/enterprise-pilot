package com.zhang.enterprisepilotjava.department.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class DepartmentTreeVO {
    private Long id;
    private String deptName;
    private Long leaderId;
    private Long parentId;
    private List<DepartmentTreeVO> children = new ArrayList<>();
}
