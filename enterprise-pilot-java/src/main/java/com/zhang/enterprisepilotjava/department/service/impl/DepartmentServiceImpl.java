package com.zhang.enterprisepilotjava.department.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.department.dto.DepartmentDTO;
import com.zhang.enterprisepilotjava.department.entity.Department;
import com.zhang.enterprisepilotjava.department.mapper.DepartmentMapper;
import com.zhang.enterprisepilotjava.department.service.DepartmentService;
import com.zhang.enterprisepilotjava.department.vo.DepartmentTreeVO;
import com.zhang.enterprisepilotjava.user.entity.User;
import com.zhang.enterprisepilotjava.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartmentServiceImpl extends ServiceImpl<DepartmentMapper, Department> implements DepartmentService {

    private static final String DEPT_TREE_CACHE_KEY = "department:tree";
    private static final long DEPT_TREE_CACHE_TTL_MINUTES = 10;

    private final UserService userService;
    private final RedisService redisService;
    private final ObjectMapper objectMapper;

    @Override
    public List<DepartmentTreeVO> getDepartmentTree() {

        // 优先读缓存
        String cached = redisService.get(DEPT_TREE_CACHE_KEY);
        if (cached != null && !cached.isBlank()) {
            try {
                return objectMapper.readValue(cached,
                        objectMapper.getTypeFactory().constructCollectionType(List.class, DepartmentTreeVO.class));
            } catch (JacksonException e) {
                redisService.delete(DEPT_TREE_CACHE_KEY);
            }
        }

        // 一次性查出所有部门
        List<Department> allDepts = this.list();

        // Entity转VO
        List<DepartmentTreeVO> allVOs = allDepts.stream().map(dept -> {
            DepartmentTreeVO vo = new DepartmentTreeVO();
            BeanUtils.copyProperties(dept, vo);
            return vo;
        }).toList();

        // 按parentId分组,方便快速找树结构
        Map<Long, List<DepartmentTreeVO>> parentIdMap = allVOs.stream()
                .collect(Collectors.groupingBy(DepartmentTreeVO::getParentId));

        // 从顶级部门开始,递归往下挂
        List<DepartmentTreeVO> tree = buildChildren(0L, parentIdMap);

        // 缓存JSON到Redis
        try {
            redisService.set(DEPT_TREE_CACHE_KEY, objectMapper.writeValueAsString(tree), DEPT_TREE_CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (JacksonException ignored) {
        }
        return tree;
    }

    @Override
    public List<DepartmentTreeVO> buildChildren(Long parentId, Map<Long, List<DepartmentTreeVO>> parentIdMap) {
        List<DepartmentTreeVO> children = parentIdMap.getOrDefault(parentId, new ArrayList<>());
        for (DepartmentTreeVO child : children) {
            child.setChildren(buildChildren(child.getId(), parentIdMap));
        }
        return children;
    }

    @Override
    public void createDepartment(DepartmentDTO dto) {

        // 校验:若非顶级部门,parentId必须真实存在
        if (dto.getParentId() != 0 && this.getById(dto.getParentId()) == null) {
            throw new BusinessException("上级部门不存在");
        }

        Department dept = new Department();
        BeanUtils.copyProperties(dto, dept);
        dept.setStatus(1);
        this.save(dept);
        redisService.delete(DEPT_TREE_CACHE_KEY);
    }

    @Override
    public void updateDepartment(Long id, DepartmentDTO dto) {
        Department dept = this.getById(id);

        if (dept == null) {
            throw new BusinessException("部门不存在");
        }

        if (dto.getParentId().equals(id)) {
            throw new BusinessException("上级部门不能是自己");
        }

        BeanUtils.copyProperties(dto, dept);
        this.updateById(dept);
        redisService.delete(DEPT_TREE_CACHE_KEY);
    }

    @Override
    public void deleteDepartment(Long id) {

        // 检查是否有子部门,若有不可直接删除
        Long childCount = this.lambdaQuery()
                .eq(Department::getParentId, id)
                .count();
        if (childCount > 0) {
            throw new BusinessException("该部门下仍设有子部门,请先删除或转移子部门");
        }

        // 检查是否有员工挂在此部门下
        Long userCount = userService.lambdaQuery()
                .eq(User::getDeptId, id)
                .count();
        if (userCount > 0) {
            throw new BusinessException("该部门下还有" + userCount + "名员工,请先转移员工再删除部门");
        }

        this.removeById(id);
        redisService.delete(DEPT_TREE_CACHE_KEY);
    }
}
