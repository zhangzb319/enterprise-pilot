package com.zhang.enterprisepilotjava.project.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DiscussionCreateDTO {
    @NotBlank(message = "内容不能为空")
    private String content;
    private Long parentId; // 顶级评论传0
}
