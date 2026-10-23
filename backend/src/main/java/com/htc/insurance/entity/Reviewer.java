
package com.htc.insurance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "reviewer")
public class Reviewer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reviewerId;

    private String name;

    private String email;

    private String contactNumber;

    private Integer rating;

    @Column(name = "review", columnDefinition = "TEXT")
    private String review;

    @Column(name = "admin_reply", columnDefinition = "TEXT")
    private String adminReply;

    private String status;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "claim_number")
    private Claims claim;

    // =====================================================
    // DEFAULT CONSTRUCTOR
    // =====================================================

    public Reviewer() {
    }

    // =====================================================
    // REVIEWER ID
    // =====================================================

    public Long getReviewerId() {
        return reviewerId;
    }

    public void setReviewerId(Long reviewerId) {
        this.reviewerId = reviewerId;
    }

    // =====================================================
    // NAME
    // =====================================================

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    // =====================================================
    // EMAIL
    // =====================================================

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    // =====================================================
    // CONTACT NUMBER
    // =====================================================

    public String getContactNumber() {
        return contactNumber;
    }

    public void setContactNumber(String contactNumber) {
        this.contactNumber = contactNumber;
    }

    // =====================================================
    // RATING
    // =====================================================

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    // =====================================================
    // REVIEW
    // =====================================================

    public String getReview() {
        return review;
    }

    public void setReview(String review) {
        this.review = review;
    }

    // =====================================================
    // ADMIN REPLY
    // =====================================================

    public String getAdminReply() {
        return adminReply;
    }

    public void setAdminReply(String adminReply) {
        this.adminReply = adminReply;
    }

    // =====================================================
    // STATUS
    // =====================================================

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    // =====================================================
    // USER RELATIONSHIP
    // =====================================================

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    // =====================================================
    // CLAIM RELATIONSHIP
    // =====================================================

    public Claims getClaim() {
        return claim;
    }

    public void setClaim(Claims claim) {
        this.claim = claim;
    }
}
