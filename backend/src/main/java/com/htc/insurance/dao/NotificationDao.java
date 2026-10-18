package com.htc.insurance.dao;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Notification;
import com.htc.insurance.repository.NotificationRepository;

@Repository
public class NotificationDao {

    @Autowired
    private NotificationRepository repository;

    public Notification save(Notification notification) {
        return repository.save(notification);
    }

    public List<Notification> getByUserId(Long userId) {
        return repository
                .findByUser_UserIdOrderByCreatedAtDesc(userId);
    }

    public long countUnread(Long userId) {
        return repository
                .countByUser_UserIdAndIsReadFalse(userId);
    }

    public List<Notification> getUnread(Long userId) {
        return repository
                .findByUser_UserIdAndIsReadFalseOrderByCreatedAtDesc(
                        userId);
    }

    public Notification findById(Long notificationId) {
        return repository
                .findById(notificationId)
                .orElse(null);
    }

    public void delete(Notification notification) {
        repository.delete(notification);
    }
}