package com.zhang.enterprisepilotjava.project.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class DiscussionTreeVO {
    private Long id;
    private Long userId;
    private String userName;
    private String content;
    private Long parentId;
    private LocalDateTime createdAt;
    private List<DiscussionTreeVO> children = new ArrayList<>();
}