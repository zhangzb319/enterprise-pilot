package com.zhang.enterprisepilotjava.department.controller;

import com.zhang.enterprisepilotjava.common.result.Result;
import com.zhang.enterprisepilotjava.department.dto.DepartmentDTO;
import com.zhang.enterprisepilotjava.department.service.DepartmentService;
import com.zhang.enterprisepilotjava.department.vo.DepartmentTreeVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping("/tree")
    public Result<List<DepartmentTreeVO>> getTree() {
        return Result.success(departmentService.getDepartmentTree());
    }

    @PostMapping
    public Result<Void> create(@RequestBody @Valid DepartmentDTO dto) {
        departmentService.createDepartment(dto);
        return Result.success();
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody @Valid DepartmentDTO dto) {
        departmentService.updateDepartment(id, dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        departmentService.deleteDepartment(id);
        return Result.success();
    }
}
