package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.NotificationDto;
import com.htc.insurance.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;


    // =========================================================
    // GET MY NOTIFICATIONS
    // =========================================================

    @GetMapping("/my")
    public ResponseEntity<List<NotificationDto>> getMyNotifications(
            Authentication authentication) {

        return ResponseEntity.ok(
                notificationService
                        .getMyNotifications(authentication)
        );
    }


    // =========================================================
    // GET UNREAD COUNT
    // =========================================================

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            Authentication authentication) {

        long count =
                notificationService
                        .getUnreadCount(authentication);

        return ResponseEntity.ok(
                Map.of("count", count)
        );
    }


    // =========================================================
    // MARK ONE AS READ
    // =========================================================

    @PutMapping("/read/{notificationId}")
    public ResponseEntity<NotificationDto> markAsRead(
            @PathVariable Long notificationId,
            Authentication authentication) {

        return ResponseEntity.ok(
                notificationService.markAsRead(
                        notificationId,
                        authentication
                )
        );
    }


    // =========================================================
    // MARK ALL AS READ
    // =========================================================

    @PutMapping("/read-all")
    public ResponseEntity<String> markAllAsRead(
            Authentication authentication) {

        notificationService.markAllAsRead(
                authentication
        );

        return ResponseEntity.ok(
                "All notifications marked as read."
        );
    }


    // =========================================================
    // DELETE NOTIFICATION
    // =========================================================

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<String> deleteNotification(
            @PathVariable Long notificationId,
            Authentication authentication) {

        notificationService.deleteNotification(
                notificationId,
                authentication
        );

        return ResponseEntity.ok(
                "Notification deleted successfully."
        );
    }
}