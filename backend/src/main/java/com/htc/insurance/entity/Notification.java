package com.htc.insurance.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Data;

@Entity
@Table(name = "notifications")
@Data
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long notificationId;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;


    @Column(nullable = false, length = 100)
    private String title;


    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;


    @Column(nullable = false, length = 50)
    private String type;


    @Column(nullable = false)
    private Boolean isRead = false;


    @Column(nullable = false)
    private LocalDateTime createdAt;


    // =========================================================
    // SYSTEM / ADMIN
    // =========================================================

    @Column(nullable = false, length = 20)
    private String source = "SYSTEM";
    
}