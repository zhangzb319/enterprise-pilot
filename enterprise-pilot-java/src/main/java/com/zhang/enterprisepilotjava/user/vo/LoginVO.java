package com.zhang.enterprisepilotjava.user.vo;

import lombok.Data;

@Data
public class LoginVO {

    private String token;
    private Long userId;
    private String realName;
}
