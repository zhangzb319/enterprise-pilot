package com.zhang.enterprisepilotjava.user.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Date;

@Data
@TableName("sys_user")
public class User {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String employeeNo;
    private Long deptId;
    private String username;
    private String passwordHash;
    private String nickname;
    private String realName;
    private String avatar;
    private Integer gender;
    private String phone;
    private String email;
    private String position;
    private Integer status;
    private Date hireDate;
    private Date leaveDate;

    @TableLogic
    private Integer isDeleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
