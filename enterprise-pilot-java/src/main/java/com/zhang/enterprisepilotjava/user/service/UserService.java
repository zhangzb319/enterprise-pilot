package com.zhang.enterprisepilotjava.user.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.zhang.enterprisepilotjava.user.dto.LoginDTO;
import com.zhang.enterprisepilotjava.user.dto.PasswordChangeDTO;
import com.zhang.enterprisepilotjava.user.dto.UserProfileUpdateDTO;
import com.zhang.enterprisepilotjava.user.dto.UserRegisterDTO;
import com.zhang.enterprisepilotjava.user.entity.User;
import com.zhang.enterprisepilotjava.user.vo.LoginVO;
import com.zhang.enterprisepilotjava.user.vo.UserDirectoryVO;
import com.zhang.enterprisepilotjava.user.vo.UserVO;

import java.util.List;

public interface UserService extends IService<User> {

    List<UserDirectoryVO> listDirectory();

    void register(UserRegisterDTO dto);

    LoginVO login(LoginDTO dto);

    UserVO getProfile(Long userId);

    void updateProfile(Long userId, UserProfileUpdateDTO dto);

    void changePassword(Long userId, PasswordChangeDTO dto);
}
