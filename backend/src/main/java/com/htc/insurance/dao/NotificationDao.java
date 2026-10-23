
package com.htc.insurance.dao;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Notification;
import com.htc.insurance.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class NotificationDao {

    private final NotificationRepository repository;

    // =========================================================
    // SAVE NOTIFICATION
    // =========================================================

    public Notification save(Notification notification) {
        return repository.save(notification);
    }

    // =========================================================
    // GET USER NOTIFICATIONS
    // NEWEST FIRST
    // =========================================================

    public List<Notification> getByUserId(Long userId) {
        return repository.findByUser_UserIdOrderByCreatedAtDesc(
                userId
        );
    }

    // =========================================================
    // COUNT UNREAD NOTIFICATIONS
    // =========================================================

    public long countUnread(Long userId) {
        return repository.countByUser_UserIdAndIsReadFalse(
                userId
        );
    }

    // =========================================================
    // GET UNREAD NOTIFICATIONS
    // NEWEST FIRST
    // =========================================================

    public List<Notification> getUnread(Long userId) {
        return repository
                .findByUser_UserIdAndIsReadFalseOrderByCreatedAtDesc(
                        userId
                );
    }

    // =========================================================
    // FIND NOTIFICATION BY ID
    // =========================================================

    public Notification findById(Long notificationId) {
        return repository.findById(notificationId)
                .orElse(null);
    }

    // =========================================================
    // DELETE NOTIFICATION
    // =========================================================

    public void delete(Notification notification) {
        repository.delete(notification);
    }
}
