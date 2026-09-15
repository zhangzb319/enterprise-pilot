package com.zhang.enterprisepilotjava.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserProfileUpdateDTO {

    private String nickname;

    @NotBlank(message = "真实姓名不能为空")
    private String realName;

    private Integer gender;

    private String phone;

    private String email;

    private String position;

    private String avatar;
}
