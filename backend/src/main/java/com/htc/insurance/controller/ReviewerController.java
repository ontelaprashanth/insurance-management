
package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.htc.insurance.dto.ReviewerDto;
import com.htc.insurance.service.ReviewerService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/reviewer")
@RequiredArgsConstructor
public class ReviewerController {

    private final ReviewerService reviewerService;

    // =========================================================
    // USER - SUBMIT REVIEW
    // =========================================================

    @PostMapping("/save")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> saveReviewer(
            @RequestBody ReviewerDto reviewerDto) {

        try {
            ReviewerDto saved =
                    reviewerService.saveReviewer(reviewerDto);

            return saved == null
                    ? error(HttpStatus.BAD_REQUEST, "Unable to save review.")
                    : ResponseEntity.status(HttpStatus.CREATED).body(saved);

        } catch (RuntimeException e) {
            return error(HttpStatus.BAD_REQUEST, safeMessage(e));
        }
    }

    // =========================================================
    // USER - VIEW MY REVIEWS
    // =========================================================

    @GetMapping("/my-reviews")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<ReviewerDto>> getMyReviews() {

        return ResponseEntity.ok(reviewerService.getMyReviews());
    }

    // =========================================================
    // ADMIN - VIEW ALL REVIEWS
    // =========================================================

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ReviewerDto>> getAllReviewers() {

        return ResponseEntity.ok(reviewerService.getAllReviewers());
    }

    // =========================================================
    // ADMIN - VIEW REVIEW BY ID
    // =========================================================

    @GetMapping("/get/{reviewerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getReviewerById(
            @PathVariable Long reviewerId) {

        return reviewerResponse(
                reviewerService.getReviewerById(reviewerId)
        );
    }

    // =========================================================
    // ADMIN - UPDATE REVIEW
    // =========================================================

    @PutMapping("/update/{reviewerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateReviewer(
            @PathVariable Long reviewerId,
            @RequestBody ReviewerDto reviewerDto) {

        try {
            return reviewerResponse(
                    reviewerService.updateReviewer(
                            reviewerId,
                            reviewerDto
                    )
            );

        } catch (RuntimeException e) {
            return error(HttpStatus.BAD_REQUEST, safeMessage(e));
        }
    }

    // =========================================================
    // ADMIN - REPLY TO REVIEW
    // =========================================================

    @PutMapping("/reply/{reviewerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> replyToReviewer(
            @PathVariable Long reviewerId,
            @RequestBody ReviewerDto reviewerDto) {

        try {
            if (reviewerDto == null
                    || reviewerDto.getAdminReply() == null
                    || reviewerDto.getAdminReply().isBlank()) {

                return error(
                        HttpStatus.BAD_REQUEST,
                        "Admin reply is required."
                );
            }

            return reviewerResponse(
                    reviewerService.replyToReviewer(
                            reviewerId,
                            reviewerDto.getAdminReply()
                    )
            );

        } catch (RuntimeException e) {
            return error(HttpStatus.BAD_REQUEST, safeMessage(e));
        }
    }

    // =========================================================
    // ADMIN - DELETE REVIEW
    // =========================================================

    @DeleteMapping("/delete/{reviewerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteReviewer(
            @PathVariable Long reviewerId) {

        try {
            reviewerService.deleteReviewer(reviewerId);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "Reviewer deleted successfully."
                    )
            );

        } catch (RuntimeException e) {
            return error(HttpStatus.NOT_FOUND, safeMessage(e));
        }
    }

    // =========================================================
    // SHARED REVIEW RESPONSE
    // =========================================================

    private ResponseEntity<?> reviewerResponse(ReviewerDto reviewer) {

        return reviewer == null
                ? error(HttpStatus.NOT_FOUND, "Reviewer not found.")
                : ResponseEntity.ok(reviewer);
    }

    // =========================================================
    // SHARED ERROR RESPONSE
    // =========================================================

    private ResponseEntity<?> error(
            HttpStatus status,
            String message) {

        return ResponseEntity.status(status).body(
                Map.of(
                        "success", false,
                        "message", message
                )
        );
    }

    // =========================================================
    // SAFE ERROR MESSAGE
    // =========================================================

    private String safeMessage(RuntimeException exception) {

        String message = exception.getMessage();

        return message == null || message.isBlank()
                ? "Unable to process review request."
                : message;
    }
}
