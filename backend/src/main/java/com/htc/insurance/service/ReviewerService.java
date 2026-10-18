package com.htc.insurance.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.htc.insurance.dao.ClaimsDao;
import com.htc.insurance.dao.ReviewerDao;
import com.htc.insurance.dao.UserDao;
import com.htc.insurance.dto.ReviewerDto;
import com.htc.insurance.entity.ClaimStatus;
import com.htc.insurance.entity.Claims;
import com.htc.insurance.entity.Policy;
import com.htc.insurance.entity.PolicyHolder;
import com.htc.insurance.entity.Reviewer;
import com.htc.insurance.entity.User;
import com.htc.insurance.mapper.ReviewerMapper;

@Service
public class ReviewerService {

    @Autowired
    private ReviewerDao reviewerDao;

    @Autowired
    private UserDao userDao;

    @Autowired
    private ClaimsDao claimsDao;

    @Autowired
    private ReviewerMapper mapper;

    @Autowired
    private NotificationService notificationService;


    // =========================================================
    // USER - SAVE REVIEW
    // =========================================================

    public ReviewerDto saveReviewer(
            ReviewerDto reviewerDto) {

        if (reviewerDto == null) {
            throw new RuntimeException(
                    "Review data is required.");
        }

        if (reviewerDto.getClaimNumber() == null) {
            throw new RuntimeException(
                    "Claim number is required.");
        }

        if (reviewerDto.getRating() == null) {
            throw new RuntimeException(
                    "Rating is required.");
        }

        if (reviewerDto.getRating() < 1
                || reviewerDto.getRating() > 5) {

            throw new RuntimeException(
                    "Rating must be between 1 and 5.");
        }

        if (reviewerDto.getReview() == null
                || reviewerDto.getReview().trim().isEmpty()) {

            throw new RuntimeException(
                    "Review message is required.");
        }


        // =====================================================
        // GET AUTHENTICATED USER
        // =====================================================

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new RuntimeException(
                    "User authentication is required.");
        }

        String username =
                authentication.getName();


        // =====================================================
        // FIND LOGGED-IN USER
        // =====================================================

        User user =
                userDao.getUserByUsername(username);

        if (user == null) {
            throw new RuntimeException(
                    "Authenticated user not found.");
        }


        // =====================================================
        // FIND CLAIM
        // =====================================================

        Claims claim =
                claimsDao.getClaimsById(
                        reviewerDto.getClaimNumber());

        if (claim == null) {
            throw new RuntimeException(
                    "Claim not found.");
        }


        // =====================================================
        // VERIFY CLAIM OWNERSHIP
        //
        // Claim
        //   ↓
        // Policy
        //   ↓
        // PolicyHolder
        //   ↓
        // User
        // =====================================================

        Policy policy =
                claim.getPolicy();

        if (policy == null) {
            throw new RuntimeException(
                    "Claim is not associated with a policy.");
        }

        PolicyHolder policyHolder =
                policy.getPolicyHolder();

        if (policyHolder == null) {
            throw new RuntimeException(
                    "Policy is not associated with a policy holder.");
        }

        User claimOwner =
                policyHolder.getUser();

        if (claimOwner == null) {
            throw new RuntimeException(
                    "Policy holder is not associated with a user.");
        }

        if (claimOwner.getUserId() == null
                || user.getUserId() == null
                || !claimOwner.getUserId()
                        .equals(user.getUserId())) {

            throw new RuntimeException(
                    "You can only review your own claim.");
        }


        // =====================================================
        // CLAIM MUST BE COMPLETED
        //
        // Do not allow reviews while claim is still pending.
        // =====================================================

        if (claim.getStatus() == ClaimStatus.PENDING) {

            throw new RuntimeException(
                    "You can review the claim only after it has been processed.");
        }


        // =====================================================
        // PREVENT DUPLICATE REVIEW FOR SAME CLAIM
        // =====================================================

        List<Reviewer> existingReviews =
                reviewerDao.getAllReviewers();

        boolean alreadyReviewed =
                existingReviews
                        .stream()
                        .anyMatch(existingReviewer ->

                                existingReviewer.getUser() != null
                                && existingReviewer.getClaim() != null
                                && existingReviewer.getUser()
                                        .getUserId() != null
                                && existingReviewer.getClaim()
                                        .getClaimNumber() != null

                                && existingReviewer.getUser()
                                        .getUserId()
                                        .equals(user.getUserId())

                                && existingReviewer.getClaim()
                                        .getClaimNumber()
                                        .equals(claim.getClaimNumber())
                        );

        if (alreadyReviewed) {

            throw new RuntimeException(
                    "You have already submitted a review for this claim.");
        }


        // =====================================================
        // CONVERT DTO -> ENTITY
        // =====================================================

        Reviewer reviewer =
                mapper.convertReviewerDtoToEntity(
                        reviewerDto);

        if (reviewer == null) {
            throw new RuntimeException(
                    "Unable to create review.");
        }


        // =====================================================
        // SET RELATIONSHIPS FROM AUTHENTICATED DATA
        //
        // Never trust userId / claim relationship
        // supplied by frontend.
        // =====================================================

        reviewer.setUser(user);

        reviewer.setClaim(claim);


        // =====================================================
        // USER INFORMATION
        // =====================================================

        reviewer.setName(
                user.getUsername());


        // =====================================================
        // OPTIONAL CONTACT INFORMATION
        // =====================================================

        reviewer.setEmail(
                reviewerDto.getEmail());

        reviewer.setContactNumber(
                reviewerDto.getContactNumber());


        // =====================================================
        // REVIEW INFORMATION
        // =====================================================

        reviewer.setRating(
                reviewerDto.getRating());

        reviewer.setReview(
                reviewerDto.getReview().trim());


        // =====================================================
        // NEW REVIEW ALWAYS STARTS AS PENDING
        // =====================================================

        reviewer.setStatus(
                "PENDING");


        // =====================================================
        // ADMIN HAS NOT REPLIED YET
        // =====================================================

        reviewer.setAdminReply(null);


        // =====================================================
        // SAVE REVIEW
        // =====================================================

        Reviewer savedReviewer =
                reviewerDao.saveReviewer(
                        reviewer);

        return mapper.convertReviewerEntityToDto(
                savedReviewer);
    }


    // =========================================================
    // ADMIN - GET ALL REVIEWS
    // =========================================================

    public List<ReviewerDto> getAllReviewers() {

        List<Reviewer> reviewers =
                reviewerDao.getAllReviewers();

        List<ReviewerDto> dtoList =
                new ArrayList<>();

        for (Reviewer reviewer : reviewers) {

            ReviewerDto dto =
                    mapper.convertReviewerEntityToDto(
                            reviewer);

            dtoList.add(dto);
        }

        return dtoList;
    }


    // =========================================================
    // ADMIN - GET REVIEW BY ID
    // =========================================================

    public ReviewerDto getReviewerById(
            Long reviewerId) {

        if (reviewerId == null) {
            throw new RuntimeException(
                    "Reviewer ID is required.");
        }

        Reviewer reviewer =
                reviewerDao.getReviewerById(
                        reviewerId);

        if (reviewer == null) {
            return null;
        }

        return mapper.convertReviewerEntityToDto(
                reviewer);
    }


    // =========================================================
    // USER - GET MY REVIEWS
    // =========================================================

    public List<ReviewerDto> getMyReviews() {

        List<ReviewerDto> myReviews =
                new ArrayList<>();

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            return myReviews;
        }

        String username =
                authentication.getName();

        User user =
                userDao.getUserByUsername(username);

        if (user == null) {
            return myReviews;
        }

        List<Reviewer> allReviews =
                reviewerDao.getAllReviewers();

        for (Reviewer reviewer : allReviews) {

            if (reviewer.getUser() != null
                    && reviewer.getUser().getUserId() != null
                    && reviewer.getUser()
                            .getUserId()
                            .equals(user.getUserId())) {

                ReviewerDto dto =
                        mapper.convertReviewerEntityToDto(
                                reviewer);

                myReviews.add(dto);
            }
        }

        return myReviews;
    }


    // =========================================================
    // ADMIN - UPDATE REVIEW
    // =========================================================

    public ReviewerDto updateReviewer(
            Long reviewerId,
            ReviewerDto reviewerDto) {

        if (reviewerId == null) {
            throw new RuntimeException(
                    "Reviewer ID is required.");
        }

        if (reviewerDto == null) {
            throw new RuntimeException(
                    "Review data is required.");
        }

        Reviewer existingReviewer =
                reviewerDao.getReviewerById(
                        reviewerId);

        if (existingReviewer == null) {
            return null;
        }

        Reviewer reviewer =
                mapper.convertReviewerDtoToEntity(
                        reviewerDto);

        if (reviewer == null) {
            throw new RuntimeException(
                    "Unable to update review.");
        }


        // =====================================================
        // KEEP ORIGINAL ID
        // =====================================================

        reviewer.setReviewerId(
                reviewerId);


        // =====================================================
        // NEVER MOVE REVIEW TO ANOTHER USER OR CLAIM
        // =====================================================

        reviewer.setUser(
                existingReviewer.getUser());

        reviewer.setClaim(
                existingReviewer.getClaim());


        // =====================================================
        // PRESERVE ADMIN-CONTROLLED FIELDS
        // =====================================================

        reviewer.setAdminReply(
                existingReviewer.getAdminReply());

        reviewer.setStatus(
                existingReviewer.getStatus());


        // =====================================================
        // VALIDATE RATING
        // =====================================================

        if (reviewer.getRating() != null
                && (reviewer.getRating() < 1
                || reviewer.getRating() > 5)) {

            throw new RuntimeException(
                    "Rating must be between 1 and 5.");
        }


        // =====================================================
        // PRESERVE NAME
        // =====================================================

        if (reviewer.getName() == null
                || reviewer.getName().isBlank()) {

            reviewer.setName(
                    existingReviewer.getName());
        }


        // =====================================================
        // PRESERVE REVIEW
        // =====================================================

        if (reviewer.getReview() == null
                || reviewer.getReview().isBlank()) {

            reviewer.setReview(
                    existingReviewer.getReview());

        } else {

            reviewer.setReview(
                    reviewer.getReview().trim());
        }


        // =====================================================
        // PRESERVE EMAIL
        // =====================================================

        if (reviewer.getEmail() == null
                || reviewer.getEmail().isBlank()) {

            reviewer.setEmail(
                    existingReviewer.getEmail());
        }


        // =====================================================
        // PRESERVE CONTACT NUMBER
        // =====================================================

        if (reviewer.getContactNumber() == null
                || reviewer.getContactNumber().isBlank()) {

            reviewer.setContactNumber(
                    existingReviewer.getContactNumber());
        }


        // =====================================================
        // SAVE
        // =====================================================

        Reviewer updatedReviewer =
                reviewerDao.updateReviewer(
                        reviewer);

        return mapper.convertReviewerEntityToDto(
                updatedReviewer);
    }


    // =========================================================
    // ADMIN - REPLY TO REVIEW
    // =========================================================

    public ReviewerDto replyToReviewer(
            Long reviewerId,
            String reply) {

        if (reviewerId == null) {
            throw new RuntimeException(
                    "Reviewer ID is required.");
        }

        if (reply == null
                || reply.trim().isEmpty()) {

            throw new RuntimeException(
                    "Admin reply is required.");
        }

        Reviewer reviewer =
                reviewerDao.getReviewerById(
                        reviewerId);

        if (reviewer == null) {
            return null;
        }


        // =====================================================
        // SAVE ADMIN REPLY
        // =====================================================

        reviewer.setAdminReply(
                reply.trim());


        // =====================================================
        // MARK REVIEW AS REPLIED
        // =====================================================

        reviewer.setStatus(
                "REPLIED");


        // =====================================================
        // UPDATE DATABASE
        // =====================================================

        Reviewer updatedReviewer =
                reviewerDao.updateReviewer(
                        reviewer);


        // =====================================================
        // NOTIFY CUSTOMER
        //
        // ONLY ADMIN REPLY CREATES A REVIEW NOTIFICATION
        // =====================================================

        createAdminReplyNotification(
                updatedReviewer);


        return mapper.convertReviewerEntityToDto(
                updatedReviewer);
    }


    // =========================================================
    // ADMIN - DELETE REVIEW
    // =========================================================

    public void deleteReviewer(
            Long reviewerId) {

        if (reviewerId == null) {
            throw new RuntimeException(
                    "Reviewer ID is required.");
        }

        Reviewer reviewer =
                reviewerDao.getReviewerById(
                        reviewerId);

        if (reviewer == null) {
            throw new RuntimeException(
                    "Reviewer not found: " + reviewerId);
        }

        reviewerDao.deleteReviewer(
                reviewerId);
    }


    // =========================================================
    // NOTIFICATION
    //
    // ONLY USED WHEN ADMIN REPLIES TO A REVIEW
    // =========================================================

    private void createAdminReplyNotification(
            Reviewer reviewer) {

        if (reviewer == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Reviewer is null.");
            return;
        }

        User user =
                reviewer.getUser();

        if (user == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Review user is null.");
            return;
        }

        if (user.getUserId() == null) {
            System.out.println(
                    "NOTIFICATION SKIPPED: Review user ID is null.");
            return;
        }


        // =====================================================
        // GET CLAIM NUMBER
        // =====================================================

        Long claimNumber = null;

        if (reviewer.getClaim() != null) {

            claimNumber =
                    reviewer.getClaim()
                            .getClaimNumber();
        }


        // =====================================================
        // BUILD MESSAGE
        // =====================================================

        String message =
                "InsureX has replied to your review";

        if (claimNumber != null) {

            message +=
                    " for claim #"
                    + claimNumber;
        }

        message +=
                ". Please open your Reviews page to view the response.";


        // =====================================================
        // CREATE NOTIFICATION
        // =====================================================

        try {

            notificationService.createNotification(
                    user,
                    "Admin Replied to Your Review",
                    message,
                    "REVIEW"
            );

            System.out.println(
                    "NOTIFICATION: Admin reply notification "
                    + "created successfully for user "
                    + user.getUsername());

        } catch (Exception e) {

            System.out.println(
                    "NOTIFICATION ERROR: "
                    + e.getClass().getSimpleName()
                    + " - "
                    + e.getMessage());
        }
    }
}