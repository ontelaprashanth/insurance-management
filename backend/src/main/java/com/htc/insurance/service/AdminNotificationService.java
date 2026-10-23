
package com.htc.insurance.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.NotificationDao;
import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.NotificationDto;
import com.htc.insurance.entity.Notification;
import com.htc.insurance.entity.User;
import com.htc.insurance.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminNotificationService {

    // =========================================================
    // DEPENDENCIES
    // =========================================================

    private final UserDao userDao;
    private final NotificationDao notificationDao;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;

    // =========================================================
    // GET CUSTOMERS FOR ADMIN BROADCAST
    // =========================================================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCustomers() {

        return userDao.getAllUsers()
                .stream()
                .filter(this::isCustomer)
                .map(user -> {
                    Map<String, Object> customer = new HashMap<>();

                    customer.put("userId", user.getUserId());
                    customer.put("username", user.getUsername());
                    customer.put("email", user.getEmail());
                    customer.put("contactNumber", user.getContactNumber());

                    return customer;
                })
                .collect(Collectors.toList());
    }

    // =========================================================
    // SEND NOTIFICATION TO ALL CUSTOMERS OR ONE CUSTOMER
    // =========================================================

    @Transactional
    public Map<String, Object> send(Map<String, Object> request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Notification request is required.");
        }

        String title = stringValue(request.get("title"));
        String message = stringValue(request.get("message"));
        String type = stringValue(request.get("type"));
        String recipientType = stringValue(request.get("recipientType"));

        // =====================================================
        // VALIDATE TITLE
        // =====================================================

        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException(
                    "Notification title is required.");
        }

        if (title.length() > 100) {
            throw new IllegalArgumentException(
                    "Notification title cannot exceed 100 characters.");
        }

        // =====================================================
        // VALIDATE MESSAGE
        // =====================================================

        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException(
                    "Notification message is required.");
        }

        // =====================================================
        // VALIDATE NOTIFICATION TYPE
        // =====================================================

        if (type == null || type.isBlank()) {
            type = "GENERAL";
        }

        type = type.trim().toUpperCase();

        if (!List.of(
                "ANNOUNCEMENT",
                "OFFER",
                "ALERT",
                "PAYMENT",
                "POLICY",
                "GENERAL"
        ).contains(type)) {
            throw new IllegalArgumentException(
                    "Unsupported notification type.");
        }

        // =====================================================
        // VALIDATE RECIPIENT TYPE
        // =====================================================

        if (recipientType == null || recipientType.isBlank()) {
            recipientType = "ALL";
        }

        recipientType = recipientType.trim().toUpperCase();

        int recipientCount = 0;

        // =====================================================
        // SEND TO ALL ACTIVE CUSTOMERS
        // =====================================================

        if ("ALL".equals(recipientType)) {

            List<User> customers = userDao.getAllUsers()
                    .stream()
                    .filter(this::isCustomer)
                    .collect(Collectors.toList());

            if (customers.isEmpty()) {
                throw new IllegalArgumentException(
                        "No active customers were found.");
            }

            for (User customer : customers) {

                notificationService.createAdminNotification(
                        customer,
                        title,
                        message,
                        type
                );

                recipientCount++;
            }

        // =====================================================
        // SEND TO A SPECIFIC CUSTOMER
        // =====================================================

        } else if ("USER".equals(recipientType)) {

            Object rawUserId = request.get("userId");

            if (rawUserId == null || rawUserId.toString().isBlank()) {
                throw new IllegalArgumentException(
                        "Choose a customer to receive the notification.");
            }

            Long userId;

            try {
                userId = Long.valueOf(rawUserId.toString());
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException(
                        "Invalid customer ID.");
            }

            User customer = userDao.getAllUsers()
                    .stream()
                    .filter(user -> Objects.equals(
                            user.getUserId(), userId))
                    .filter(this::isCustomer)
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Active customer not found."));

            notificationService.createAdminNotification(
                    customer,
                    title,
                    message,
                    type
            );

            recipientCount = 1;

        } else {
            throw new IllegalArgumentException(
                    "Recipient type must be ALL or USER.");
        }

        // =====================================================
        // SUCCESS RESPONSE
        // =====================================================

        Map<String, Object> response = new HashMap<>();

        response.put("message", "Notification sent successfully.");
        response.put("recipientCount", recipientCount);

        return response;
    }

    // =========================================================
    // ADMIN NOTIFICATION HISTORY
    // =========================================================

    @Transactional(readOnly = true)
    public List<NotificationDto> getHistory() {

        List<Notification> notifications =
                notificationRepository
                        .findBySourceOrderByCreatedAtDesc("ADMIN");

        List<NotificationDto> result = new ArrayList<>();

        for (Notification notification : notifications) {
            result.add(toDto(notification));
        }

        return result;
    }

    // =========================================================
    // DELETE ADMIN-CREATED NOTIFICATION
    // =========================================================

    @Transactional
    public void delete(Long notificationId) {

        if (notificationId == null) {
            throw new IllegalArgumentException(
                    "Notification ID is required.");
        }

        Notification notification =
                notificationDao.findById(notificationId);

        if (notification == null) {
            throw new IllegalArgumentException(
                    "Notification not found.");
        }

        if (!"ADMIN".equalsIgnoreCase(notification.getSource())) {
            throw new IllegalArgumentException(
                    "Only admin-created notifications can be deleted here.");
        }

        notificationDao.delete(notification);
    }

    // =========================================================
    // CUSTOMER VALIDATION
    // =========================================================

    private boolean isCustomer(User user) {

        return user != null
                && user.getUserId() != null
                && "USER".equalsIgnoreCase(user.getRole())
                && Boolean.TRUE.equals(user.getIsActive());
    }

    // =========================================================
    // SAFE STRING CONVERSION
    // =========================================================

    private String stringValue(Object value) {

        return value == null ? null : value.toString().trim();
    }

    // =========================================================
    // ENTITY TO DTO
    // =========================================================

    private NotificationDto toDto(Notification notification) {

        NotificationDto dto = new NotificationDto();

        dto.setNotificationId(notification.getNotificationId());

        if (notification.getUser() != null) {
            dto.setUserId(notification.getUser().getUserId());
        }

        dto.setTitle(notification.getTitle());
        dto.setMessage(notification.getMessage());
        dto.setType(notification.getType());
        dto.setIsRead(notification.getIsRead());
        dto.setCreatedAt(notification.getCreatedAt());
        dto.setSource(notification.getSource());

        return dto;
    }
}
