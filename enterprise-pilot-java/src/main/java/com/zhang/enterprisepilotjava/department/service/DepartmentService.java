package com.zhang.enterprisepilotjava.department.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.zhang.enterprisepilotjava.department.dto.DepartmentDTO;
import com.zhang.enterprisepilotjava.department.entity.Department;
import com.zhang.enterprisepilotjava.department.vo.DepartmentTreeVO;

import java.util.List;
import java.util.Map;

public interface DepartmentService extends IService<Department> {

    List<DepartmentTreeVO> getDepartmentTree();

    List<DepartmentTreeVO> buildChildren(Long parentId, Map<Long, List<DepartmentTreeVO>> parentIdMap);

    void createDepartment(DepartmentDTO dto);

    void updateDepartment(Long id, DepartmentDTO dto);

    void deleteDepartment(Long id);
}
