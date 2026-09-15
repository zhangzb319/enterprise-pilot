package com.zhang.enterprisepilotjava.user.controller;

import com.zhang.enterprisepilotjava.common.result.Result;
import com.zhang.enterprisepilotjava.common.util.JwtUtil;
import com.zhang.enterprisepilotjava.common.util.SecurityUtil;
import com.zhang.enterprisepilotjava.user.dto.LoginDTO;
import com.zhang.enterprisepilotjava.user.dto.PasswordChangeDTO;
import com.zhang.enterprisepilotjava.user.dto.UserProfileUpdateDTO;
import com.zhang.enterprisepilotjava.user.dto.UserRegisterDTO;
import com.zhang.enterprisepilotjava.user.entity.User;
import com.zhang.enterprisepilotjava.user.service.UserService;
import com.zhang.enterprisepilotjava.user.vo.LoginVO;
import com.zhang.enterprisepilotjava.user.vo.UserDirectoryVO;
import com.zhang.enterprisepilotjava.user.vo.UserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public Result<List<UserVO>> listUsers() {
        List<User> users = userService.list();

        List<UserVO> voList = users.stream().map(user -> {
            UserVO vo = new UserVO();
            BeanUtils.copyProperties(user, vo);
            return vo;
        }).toList();

        return Result.success(voList);
    }

    @GetMapping("/directory")
    public Result<List<UserDirectoryVO>> directory() {
        return Result.success(userService.listDirectory());
    }

    @PostMapping("/register")
    public Result<Void> register(@RequestBody UserRegisterDTO dto) {
        userService.register(dto);
        return Result.success();
    }

    @PostMapping("/login")
    public Result<LoginVO> login(@RequestBody LoginDTO dto) {
        LoginVO vo = userService.login(dto);
        return Result.success(vo);
    }

    @GetMapping("/me")
    public Result<UserVO> getCurrentUser() {
        Long userId = SecurityUtil.getCurrentUserId();
        return Result.success(userService.getProfile(userId));
    }

    @GetMapping("/profile")
    public Result<UserVO> getProfile() {
        Long userId = SecurityUtil.getCurrentUserId();
        return Result.success(userService.getProfile(userId));
    }

    @PutMapping("/profile")
    public Result<Void> updateProfile(@Valid @RequestBody UserProfileUpdateDTO dto) {
        Long userId = SecurityUtil.getCurrentUserId();
        userService.updateProfile(userId, dto);
        return Result.success();
    }

    @PutMapping("/password")
    public Result<Void> changePassword(@Valid @RequestBody PasswordChangeDTO dto) {
        Long userId = SecurityUtil.getCurrentUserId();
        userService.changePassword(userId, dto);
        return Result.success();
    }

    @PostMapping("/logout")
    public Result<Void> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            jwtUtil.addToBlacklist(token);
        }
        return Result.success();
    }
}
