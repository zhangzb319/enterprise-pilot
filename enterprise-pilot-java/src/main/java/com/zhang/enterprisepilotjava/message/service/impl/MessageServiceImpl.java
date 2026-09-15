package com.zhang.enterprisepilotjava.message.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.zhang.enterprisepilotjava.common.exception.BusinessException;
import com.zhang.enterprisepilotjava.common.util.SecurityUtil;
import com.zhang.enterprisepilotjava.department.entity.Department;
import com.zhang.enterprisepilotjava.department.mapper.DepartmentMapper;
import com.zhang.enterprisepilotjava.message.dto.SendMessageDTO;
import com.zhang.enterprisepilotjava.message.entity.ChatMessage;
import com.zhang.enterprisepilotjava.message.mapper.ChatMessageMapper;
import com.zhang.enterprisepilotjava.message.service.MessageService;
import com.zhang.enterprisepilotjava.message.vo.ConversationVO;
import com.zhang.enterprisepilotjava.message.vo.MessageVO;
import com.zhang.enterprisepilotjava.user.entity.User;
import com.zhang.enterprisepilotjava.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final ChatMessageMapper chatMessageMapper;
    private final UserMapper userMapper;
    private final DepartmentMapper departmentMapper;

    @Override
    public List<ConversationVO> listConversations() {
        Long me = SecurityUtil.getCurrentUserId();
        List<ChatMessage> messages = chatMessageMapper.selectList(
                new LambdaQueryWrapper<ChatMessage>()
                        .and(w -> w.eq(ChatMessage::getSenderId, me)
                                .or()
                                .eq(ChatMessage::getReceiverId, me))
                        .orderByDesc(ChatMessage::getCreatedAt));

        // 按对方 ID 汇聚：最近消息 + 未读数（desc 遍历，首次遇到即该会话最新）
        List<String> order = new ArrayList<>();
        Map<Long, ConversationVO> byUser = new HashMap<>();
        Map<Long, Long> unread = new HashMap<>();
        for (ChatMessage m : messages) {
            Long otherId = Objects.equals(m.getSenderId(), me) ? m.getReceiverId() : m.getSenderId();
            byUser.computeIfAbsent(otherId, k -> {
                order.add(otherId.toString());
                ConversationVO vo = new ConversationVO();
                vo.setUserId(otherId);
                vo.setLastMessage(m.getContent());
                vo.setLastTime(m.getCreatedAt());
                return vo;
            });
            if (Objects.equals(m.getReceiverId(), me) && Objects.equals(m.getIsRead(), 0)) {
                unread.merge(otherId, 1L, Long::sum);
            }
        }

        if (byUser.isEmpty()) {
            return List.of();
        }

        fillUserInfo(byUser);

        return order.stream()
                .map(Long::parseLong)
                .map(byUser::get)
                .peek(vo -> vo.setUnreadCount(unread.getOrDefault(vo.getUserId(), 0L)))
                .sorted(Comparator.comparing(ConversationVO::getLastTime,
                        Comparator.nullsFirst(Comparator.naturalOrder())).reversed())
                .collect(Collectors.toList());
    }

    @Override
    public List<MessageVO> listWith(Long userId) {
        Long me = SecurityUtil.getCurrentUserId();
        List<ChatMessage> messages = chatMessageMapper.selectList(
                new LambdaQueryWrapper<ChatMessage>()
                        .and(w -> w.eq(ChatMessage::getSenderId, me)
                                .eq(ChatMessage::getReceiverId, userId)
                                .or()
                                .eq(ChatMessage::getSenderId, userId)
                                .eq(ChatMessage::getReceiverId, me))
                        .orderByAsc(ChatMessage::getCreatedAt));

        // 将对方发给我的消息置为已读
        ChatMessage set = new ChatMessage();
        set.setIsRead(1);
        chatMessageMapper.update(set,
                new LambdaQueryWrapper<ChatMessage>()
                        .eq(ChatMessage::getSenderId, userId)
                        .eq(ChatMessage::getReceiverId, me)
                        .eq(ChatMessage::getIsRead, 0));

        return messages.stream().map(m -> {
            MessageVO vo = new MessageVO();
            BeanUtils.copyProperties(m, vo);
            return vo;
        }).collect(Collectors.toList());
    }

    @Override
    public MessageVO send(SendMessageDTO dto) {
        Long me = SecurityUtil.getCurrentUserId();
        if (Objects.equals(dto.getReceiverId(), me)) {
            throw new BusinessException("不能给自己发消息");
        }
        User receiver = userMapper.selectById(dto.getReceiverId());
        if (receiver == null) {
            throw new BusinessException("接收人不存在");
        }

        ChatMessage msg = new ChatMessage();
        msg.setSenderId(me);
        msg.setReceiverId(dto.getReceiverId());
        msg.setContent(dto.getContent());
        msg.setIsRead(0);
        chatMessageMapper.insert(msg);

        MessageVO vo = new MessageVO();
        BeanUtils.copyProperties(msg, vo);
        return vo;
    }

    @Override
    public Long unreadCount() {
        Long me = SecurityUtil.getCurrentUserId();
        return chatMessageMapper.selectCount(
                new LambdaQueryWrapper<ChatMessage>()
                        .eq(ChatMessage::getReceiverId, me)
                        .eq(ChatMessage::getIsRead, 0));
    }

    private void fillUserInfo(Map<Long, ConversationVO> byUser) {
        List<Long> userIds = new ArrayList<>(byUser.keySet());
        Map<Long, User> userMap = userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        // 批量查部门名
        Set<Long> deptIds = userMap.values().stream()
                .map(User::getDeptId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> deptNameMap = new HashMap<>();
        if (!deptIds.isEmpty()) {
            deptNameMap = departmentMapper.selectBatchIds(deptIds).stream()
                    .collect(Collectors.toMap(Department::getId, Department::getDeptName));
        }

        for (ConversationVO vo : byUser.values()) {
            User u = userMap.get(vo.getUserId());
            if (u == null) {
                continue;
            }
            vo.setName(StringUtils.hasText(u.getRealName()) ? u.getRealName() : u.getNickname());
            vo.setAvatar(u.getAvatar());
            vo.setPosition(u.getPosition());
            if (u.getDeptId() != null) {
                vo.setDeptName(deptNameMap.get(u.getDeptId()));
            }
        }
    }
}