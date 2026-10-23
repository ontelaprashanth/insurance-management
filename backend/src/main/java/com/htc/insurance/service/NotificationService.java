
package com.htc.insurance.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.NotificationDao;
import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.NotificationDto;
import com.htc.insurance.entity.Notification;
import com.htc.insurance.entity.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationService {

    // =========================================================
    // DEPENDENCIES
    // =========================================================

    private final NotificationDao notificationDao;
    private final UserDao userDao;

    // =========================================================
    // SYSTEM - CREATE NOTIFICATION
    // =========================================================
    // Used by Policy, Claims, Settlement, Reviewer etc.
    // Source is automatically stored as SYSTEM.
    // =========================================================

    public NotificationDto createNotification(
            User user,
            String title,
            String message,
            String type) {

        if (user == null) {
            throw new RuntimeException(
                    "Notification user is required.");
        }

        if (title == null || title.isBlank()) {
            throw new RuntimeException(
                    "Notification title is required.");
        }

        if (message == null || message.isBlank()) {
            throw new RuntimeException(
                    "Notification message is required.");
        }

        Notification notification =
                new Notification();

        notification.setUser(user);

        notification.setTitle(
                title.trim());

        notification.setMessage(
                message.trim());

        notification.setType(
                type == null || type.isBlank()
                        ? "GENERAL"
                        : type.trim().toUpperCase());

        notification.setIsRead(false);

        notification.setCreatedAt(
                LocalDateTime.now());

        // =====================================================
        // AUTOMATIC SYSTEM NOTIFICATION
        // =====================================================

        notification.setSource("SYSTEM");

        Notification saved =
                notificationDao.save(notification);

        return mapToDto(saved);
    }

    // =========================================================
    // ADMIN - CREATE NOTIFICATION
    // =========================================================
    // Used when ADMIN pushes:
    // OFFER
    // ANNOUNCEMENT
    // ALERT
    // PAYMENT
    // POLICY
    // GENERAL
    //
    // These are stored with source = ADMIN.
    // =========================================================

    public NotificationDto createAdminNotification(
            User user,
            String title,
            String message,
            String type) {

        if (user == null) {
            throw new RuntimeException(
                    "Notification user is required.");
        }

        if (title == null || title.isBlank()) {
            throw new RuntimeException(
                    "Notification title is required.");
        }

        if (message == null || message.isBlank()) {
            throw new RuntimeException(
                    "Notification message is required.");
        }

        Notification notification =
                new Notification();

        notification.setUser(user);

        notification.setTitle(
                title.trim());

        notification.setMessage(
                message.trim());

        notification.setType(
                type == null || type.isBlank()
                        ? "GENERAL"
                        : type.trim().toUpperCase());

        notification.setIsRead(false);

        notification.setCreatedAt(
                LocalDateTime.now());

        // =====================================================
        // ADMIN PUSHED NOTIFICATION
        // =====================================================

        notification.setSource("ADMIN");

        Notification saved =
                notificationDao.save(notification);

        return mapToDto(saved);
    }

    // =========================================================
    // USER - GET MY NOTIFICATIONS
    // =========================================================

    @Transactional(readOnly = true)
    public List<NotificationDto> getMyNotifications(
            Authentication authentication) {

        User user =
                getAuthenticatedUser(authentication);

        return notificationDao
                .getByUserId(user.getUserId())
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // =========================================================
    // USER - GET UNREAD COUNT
    // =========================================================

    public long getUnreadCount(
            Authentication authentication) {

        User user =
                getAuthenticatedUser(authentication);

        return notificationDao
                .countUnread(user.getUserId());
    }

    // =========================================================
    // USER - MARK ONE AS READ
    // =========================================================

    public NotificationDto markAsRead(
            Long notificationId,
            Authentication authentication) {

        if (notificationId == null) {
            throw new RuntimeException(
                    "Notification ID is required.");
        }

        User user =
                getAuthenticatedUser(authentication);

        Notification notification =
                notificationDao.findById(
                        notificationId);

        if (notification == null) {
            throw new RuntimeException(
                    "Notification not found.");
        }

        verifyOwnership(
                notification,
                user);

        notification.setIsRead(true);

        Notification updated =
                notificationDao.save(notification);

        return mapToDto(updated);
    }

    // =========================================================
    // USER - MARK ALL AS READ
    // =========================================================

    @Transactional
    public void markAllAsRead(
            Authentication authentication) {

        User user =
                getAuthenticatedUser(authentication);

        List<Notification> notifications =
                notificationDao.getByUserId(
                        user.getUserId());

        for (Notification notification :
                notifications) {

            notification.setIsRead(true);

            notificationDao.save(notification);
        }
    }

    // =========================================================
    // USER - DELETE NOTIFICATION
    // =========================================================

    public void deleteNotification(
            Long notificationId,
            Authentication authentication) {

        if (notificationId == null) {
            throw new RuntimeException(
                    "Notification ID is required.");
        }

        User user =
                getAuthenticatedUser(authentication);

        Notification notification =
                notificationDao.findById(
                        notificationId);

        if (notification == null) {
            throw new RuntimeException(
                    "Notification not found.");
        }

        verifyOwnership(
                notification,
                user);

        notificationDao.delete(notification);
    }

    // =========================================================
    // AUTHENTICATED USER
    // =========================================================

    private User getAuthenticatedUser(
            Authentication authentication) {

        if (authentication == null ||
                authentication.getName() == null ||
                authentication.getName().isBlank()) {

            throw new RuntimeException(
                    "User authentication required.");
        }

        User user =
                userDao.getUserByUsername(
                        authentication.getName());

        if (user == null) {
            throw new RuntimeException(
                    "Logged-in user not found.");
        }

        return user;
    }

    // =========================================================
    // OWNERSHIP CHECK
    // =========================================================

    private void verifyOwnership(
            Notification notification,
            User user) {

        if (notification.getUser() == null ||
                notification.getUser().getUserId() == null ||
                user == null ||
                user.getUserId() == null ||
                !notification.getUser()
                        .getUserId()
                        .equals(user.getUserId())) {

            throw new RuntimeException(
                    "You are not authorized to access this notification.");
        }
    }

    // =========================================================
    // ENTITY -> DTO
    // =========================================================

    private NotificationDto mapToDto(
            Notification notification) {

        NotificationDto dto =
                new NotificationDto();

        dto.setNotificationId(
                notification.getNotificationId());

        if (notification.getUser() != null) {

            dto.setUserId(
                    notification.getUser()
                            .getUserId());
        }

        dto.setTitle(
                notification.getTitle());

        dto.setMessage(
                notification.getMessage());

        dto.setType(
                notification.getType());

        dto.setIsRead(
                notification.getIsRead());

        dto.setCreatedAt(
                notification.getCreatedAt());

        // =====================================================
        // SOURCE
        // =====================================================

        dto.setSource(
                notification.getSource());

        return dto;
    }
}
