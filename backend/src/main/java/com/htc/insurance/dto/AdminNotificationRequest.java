
package com.htc.insurance.dto;

import jakarta.validation.constraints.NotBlank;

import lombok.Data;

@Data
public class AdminNotificationRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    @NotBlank(message = "Notification type is required")
    private String type;

    @NotBlank(message = "Recipient type is required")
    private String recipientType;

    private Long userId;
}
