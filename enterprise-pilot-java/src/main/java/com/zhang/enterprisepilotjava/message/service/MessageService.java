package com.zhang.enterprisepilotjava.message.service;

import com.zhang.enterprisepilotjava.message.dto.SendMessageDTO;
import com.zhang.enterprisepilotjava.message.vo.ConversationVO;
import com.zhang.enterprisepilotjava.message.vo.MessageVO;

import java.util.List;

public interface MessageService {

    List<ConversationVO> listConversations();

    List<MessageVO> listWith(Long userId);

    MessageVO send(SendMessageDTO dto);

    Long unreadCount();
}