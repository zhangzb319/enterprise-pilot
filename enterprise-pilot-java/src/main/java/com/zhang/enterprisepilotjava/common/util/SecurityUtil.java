package com.zhang.enterprisepilotjava.common.util;

import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtil {

    // 从登录信息取出userId
    public static Long getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal();
        return (Long) principal;
    }
}
