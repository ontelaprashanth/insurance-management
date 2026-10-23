
package com.htc.insurance.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Notification;

@Repository
public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    // =========================================================
    // CUSTOMER NOTIFICATIONS
    // =========================================================

    /**
     * Retrieves all notifications belonging to a user.
     *
     * Newest notifications first.
     */
    List<Notification> findByUser_UserIdOrderByCreatedAtDesc(
            Long userId
    );

    // =========================================================
    // UNREAD NOTIFICATION COUNT
    // =========================================================

    /**
     * Counts unread notifications for a user.
     *
     * Used for notification badges.
     */
    long countByUser_UserIdAndIsReadFalse(
            Long userId
    );

    // =========================================================
    // UNREAD CUSTOMER NOTIFICATIONS
    // =========================================================

    /**
     * Retrieves unread notifications belonging to a user.
     *
     * Newest notifications first.
     */
    List<Notification> findByUser_UserIdAndIsReadFalseOrderByCreatedAtDesc(
            Long userId
    );

    // =========================================================
    // ADMIN NOTIFICATIONS
    // =========================================================

    /**
     * Retrieves notifications by their source.
     *
     * Example source:
     * ADMIN or SYSTEM.
     *
     * Newest notifications first.
     */
    List<Notification> findBySourceOrderByCreatedAtDesc(
            String source
    );
}
