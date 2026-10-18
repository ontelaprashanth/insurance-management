package com.htc.insurance.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Notification;

@Repository
public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification>
    findByUser_UserIdOrderByCreatedAtDesc(
            Long userId);


    long countByUser_UserIdAndIsReadFalse(
            Long userId);


    List<Notification>
    findByUser_UserIdAndIsReadFalseOrderByCreatedAtDesc(
            Long userId);


    // =========================================================
    // ADMIN NOTIFICATIONS
    // =========================================================

    List<Notification>
    findBySourceOrderByCreatedAtDesc(
            String source);
}