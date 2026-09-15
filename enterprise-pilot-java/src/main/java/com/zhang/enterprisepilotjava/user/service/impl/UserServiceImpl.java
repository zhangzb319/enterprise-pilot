package com.zhang.enterprisepilotjava.user.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.common.util.JwtUtil;
import com.zhang.enterprisepilotjava.department.entity.Department;
import com.zhang.enterprisepilotjava.department.mapper.DepartmentMapper;
import com.zhang.enterprisepilotjava.user.dto.LoginDTO;
import com.zhang.enterprisepilotjava.user.dto.PasswordChangeDTO;
import com.zhang.enterprisepilotjava.user.dto.UserProfileUpdateDTO;
import com.zhang.enterprisepilotjava.user.dto.UserRegisterDTO;
import com.zhang.enterprisepilotjava.user.entity.User;
import com.zhang.enterprisepilotjava.user.mapper.UserMapper;
import com.zhang.enterprisepilotjava.user.service.UserService;
import com.zhang.enterprisepilotjava.user.vo.LoginVO;
import com.zhang.enterprisepilotjava.user.vo.UserDirectoryVO;
import com.zhang.enterprisepilotjava.user.vo.UserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    private static final String PROFILE_CACHE_PREFIX = "user:profile:";
    private static final String ROLE_CACHE_PREFIX = "user:roles:";
    private static final long PROFILE_CACHE_TTL_MINUTES = 5;

    private final JwtUtil jwtUtil;

    private final PasswordEncoder passwordEncoder;

    private final DepartmentMapper departmentMapper;

    private final RedisService redisService;

    private final ObjectMapper objectMapper;

    @Override
    public List<UserDirectoryVO> listDirectory() {
        // 只返回在职员工（status = 1）
        List<User> users = this.lambdaQuery()
                .eq(User::getStatus, 1)
                .orderByAsc(User::getDeptId)
                .orderByAsc(User::getEmployeeNo)
                .list();

        if (users.isEmpty()) {
            return List.of();
        }

        // 批量查询部门名称，避免 N+1
        List<Long> deptIds = users.stream()
                .map(User::getDeptId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, String> deptNameMap;
        if (deptIds.isEmpty()) {
            deptNameMap = Map.of();
        } else {
            deptNameMap = departmentMapper.selectBatchIds(deptIds).stream()
                    .collect(Collectors.toMap(Department::getId, Department::getDeptName));
        }

        return users.stream().map(user -> {
            UserDirectoryVO vo = new UserDirectoryVO();
            BeanUtils.copyProperties(user, vo);
            if (user.getDeptId() != null) {
                vo.setDeptName(deptNameMap.get(user.getDeptId()));
            }
            return vo;
        }).toList();
    }

    @Override
    public void register(UserRegisterDTO dto) {

        // 检查用户名是否被占用
        Long count = this.lambdaQuery()
                .eq(User::getUsername, dto.getUsername())
                .count();
        if (count > 0) {
            throw new BusinessException("用户名已被注册");
        }

        // DTO转Entity
        User user = new User();
        BeanUtils.copyProperties(dto, user);

        // 密码加密
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));

        // 给定默认值
        user.setStatus(1); // 直接设为在职

        this.save(user);
    }

    @Override
    public LoginVO login(LoginDTO dto) {

        // 查询用户名是否存在
        User user = this.lambdaQuery()
                .eq(User::getUsername, dto.getUsername())
                .one();

        if (user == null) {
            throw new BusinessException("用户名或密码错误");
        }

        // 校验密码
        if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("用户名或密码错误");
        }

        // 检查账号状态
        if (user.getStatus() == 2 || user.getStatus() == 3) {
            throw new BusinessException("账号已离职或被禁用");
        }

        // 生成Token
        String token = jwtUtil.generateToken(user.getId());

        // 组装返回结果
        LoginVO vo = new LoginVO();
        vo.setToken(token);
        vo.setUserId(user.getId());
        vo.setRealName(user.getRealName());
        return vo;
    }

    @Override
    public UserVO getProfile(Long userId) {
        String cacheKey = PROFILE_CACHE_PREFIX + userId;
        String cached = redisService.get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, UserVO.class);
            } catch (JacksonException e) {
                redisService.delete(cacheKey);
            }
        }

        UserVO vo = buildProfile(userId);
        try {
            redisService.set(cacheKey, objectMapper.writeValueAsString(vo), PROFILE_CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (JacksonException ignored) {
        }
        return vo;
    }

    private UserVO buildProfile(Long userId) {
        User user = this.getById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        UserVO vo = new UserVO();
        BeanUtils.copyProperties(user, vo);

        // 部门名称
        if (user.getDeptId() != null) {
            Department dept = departmentMapper.selectById(user.getDeptId());
            if (dept != null) {
                vo.setDeptName(dept.getDeptName());
            }
        }

        // 角色名称
        List<String> roleCodes = this.baseMapper.selectRoleCodesByUserId(userId);
        if (roleCodes.isEmpty()) {
            vo.setRoleName("员工");
        } else {
            vo.setRoleName(roleCodes.stream()
                    .map(UserServiceImpl::roleCodeToName)
                    .distinct()
                    .collect(Collectors.joining("、")));
        }
        return vo;
    }

    @Override
    public void updateProfile(Long userId, UserProfileUpdateDTO dto) {
        User user = this.getById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        // 手机号唯一性校验
        if (dto.getPhone() != null && !dto.getPhone().isBlank()) {
            Long count = this.lambdaQuery()
                    .eq(User::getPhone, dto.getPhone())
                    .ne(User::getId, userId)
                    .count();
            if (count > 0) {
                throw new BusinessException("手机号已被其他用户使用");
            }
        }

        // 邮箱唯一性校验
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            Long count = this.lambdaQuery()
                    .eq(User::getEmail, dto.getEmail())
                    .ne(User::getId, userId)
                    .count();
            if (count > 0) {
                throw new BusinessException("邮箱已被其他用户使用");
            }
        }

        user.setNickname(dto.getNickname());
        user.setRealName(dto.getRealName());
        user.setGender(dto.getGender());
        user.setPhone(dto.getPhone());
        user.setEmail(dto.getEmail());
        user.setPosition(dto.getPosition());
        user.setAvatar(dto.getAvatar());
        this.updateById(user);

        // 资料变更,失效资料缓存;如角色有变更则失效角色缓存
        redisService.delete(PROFILE_CACHE_PREFIX + userId);
        redisService.delete(ROLE_CACHE_PREFIX + userId);
    }

    @Override
    public void changePassword(Long userId, PasswordChangeDTO dto) {
        User user = this.getById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPasswordHash())) {
            throw new BusinessException("原密码错误");
        }

        if (dto.getOldPassword().equals(dto.getNewPassword())) {
            throw new BusinessException("新密码不能与原密码相同");
        }

        user.setPasswordHash(passwordEncoder.encode(dto.getNewPassword()));
        this.updateById(user);
    }

    private static String roleCodeToName(String code) {
        return switch (code) {
            case "ROLE_ADMIN" -> "管理员";
            case "ROLE_MANAGER" -> "部门经理";
            default -> "员工";
        };
    }
}
