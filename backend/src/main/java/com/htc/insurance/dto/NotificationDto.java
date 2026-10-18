package com.htc.insurance.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class NotificationDto {

    private Long notificationId;

    private Long userId;

    private String title;

    private String message;

    private String type;

    private Boolean isRead;

    private LocalDateTime createdAt;

    private String source;
}