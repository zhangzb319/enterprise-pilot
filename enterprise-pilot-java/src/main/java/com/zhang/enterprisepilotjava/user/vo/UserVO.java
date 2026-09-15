package com.zhang.enterprisepilotjava.user.vo;

import lombok.Data;

import java.util.Date;

@Data
public class UserVO {

    private Long id;
    private String employeeNo;
    private String username;
    private String nickname;
    private String realName;
    private String avatar;
    private Integer gender;
    private String phone;
    private String email;
    private String position;
    private Integer status;
    private Long deptId;
    private String deptName;
    private String roleName;
    private Date hireDate;
}
