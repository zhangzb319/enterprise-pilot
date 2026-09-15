package com.zhang.enterprisepilotjava.notification.vo;

import lombok.Data;

import java.util.List;

@Data
public class NotificationPageVO {
    private List<NotificationVO> records;
    private Long total;
}
