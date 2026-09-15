package com.zhang.enterprisepilotjava.notification.service;

import com.zhang.enterprisepilotjava.notification.vo.NotificationPageVO;

public interface NotificationService {

    NotificationPageVO getMyNotifications(int page, int size);

    long getUnreadCount();

    void markRead(Long id);

    void markAllRead();

    void deleteNotification(Long id);

    void send(Long userId, String type, String title, String content, Long relatedId);
}
