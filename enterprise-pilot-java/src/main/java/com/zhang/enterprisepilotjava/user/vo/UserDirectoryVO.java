package com.zhang.enterprisepilotjava.user.vo;

import lombok.Data;

import java.util.Date;

@Data
public class UserDirectoryVO {

    private Long id;
    private String employeeNo;
    private String realName;
    private String nickname;
    private Integer gender;
    private String avatar;
    private String position;
    private String phone;
    private String email;
    private Long deptId;
    private String deptName;
    private Date hireDate;
}