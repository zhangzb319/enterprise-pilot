package com.zhang.enterprisepilotjava.notification.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.common.util.SecurityUtil;
import com.zhang.enterprisepilotjava.notification.entity.Notification;
import com.zhang.enterprisepilotjava.notification.mapper.NotificationMapper;
import com.zhang.enterprisepilotjava.notification.service.NotificationService;
import com.zhang.enterprisepilotjava.notification.vo.NotificationPageVO;
import com.zhang.enterprisepilotjava.notification.vo.NotificationVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl extends ServiceImpl<NotificationMapper, Notification> implements NotificationService {

    private static final String UNREAD_CACHE_PREFIX = "notification:unread:";

    private final RedisService redisService;

    @Override
    public NotificationPageVO getMyNotifications(int page, int size) {
        Long userId = SecurityUtil.getCurrentUserId();
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .orderByDesc(Notification::getCreatedAt);
        long total = this.count(wrapper);
        List<NotificationVO> records = this.list(wrapper.last("limit " + (page - 1) * size + ", " + size))
                .stream().map(n -> {
                    NotificationVO vo = new NotificationVO();
                    BeanUtils.copyProperties(n, vo);
                    return vo;
                }).toList();
        NotificationPageVO result = new NotificationPageVO();
        result.setRecords(records);
        result.setTotal(total);
        return result;
    }

    @Override
    public long getUnreadCount() {
        Long userId = SecurityUtil.getCurrentUserId();
        String cacheKey = UNREAD_CACHE_PREFIX + userId;
        String cached = redisService.get(cacheKey);
        if (cached != null) {
            return Long.parseLong(cached);
        }
        long count = this.count(new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .eq(Notification::getIsRead, 0));
        redisService.set(cacheKey, String.valueOf(count));
        return count;
    }

    @Override
    @Transactional
    public void markRead(Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        Notification n = this.getById(id);
        if (n == null || !n.getUserId().equals(userId)) {
            throw new BusinessException("通知不存在");
        }
        if (n.getIsRead() == 0) {
            n.setIsRead(1);
            this.updateById(n);
            // 仅从未读变已读时递减
            redisService.decrement(UNREAD_CACHE_PREFIX + userId);
        }
    }

    @Override
    @Transactional
    public void markAllRead() {
        Long userId = SecurityUtil.getCurrentUserId();
        this.update(new LambdaUpdateWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .eq(Notification::getIsRead, 0)
                .set(Notification::getIsRead, 1));
        // 全部已读,直接删除缓存
        redisService.delete(UNREAD_CACHE_PREFIX + userId);
    }

    @Override
    @Transactional
    public void deleteNotification(Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        Notification n = this.getById(id);
        if (n == null || !n.getUserId().equals(userId)) {
            throw new BusinessException("通知不存在");
        }
        this.removeById(id);
    }

    @Override
    public void send(Long userId, String type, String title, String content, Long relatedId) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setContent(content);
        n.setRelatedId(relatedId);
        n.setIsRead(0);
        this.save(n);
        // 新通知未读,递增计数
        redisService.increment(UNREAD_CACHE_PREFIX + userId);
    }
}
