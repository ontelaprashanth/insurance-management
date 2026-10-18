package com.htc.insurance.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dto.ReviewerDto;
import com.htc.insurance.service.ReviewerService;

@RestController
@RequestMapping("/reviewer")
public class ReviewerController {

    @Autowired
    private ReviewerService reviewerService;


    // =========================================================
    // USER - SUBMIT REVIEW
    // =========================================================

    @PostMapping("/save")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> saveReviewer(
            @RequestBody ReviewerDto reviewerDto) {

        try {

            ReviewerDto savedReviewer =
                    reviewerService.saveReviewer(reviewerDto);

            if (savedReviewer == null) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "success", false,
                                "message", "Unable to save review."
                        )
                );
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(
                    savedReviewer
            );

        } catch (RuntimeException e) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // =========================================================
    // USER - VIEW MY REVIEWS
    // =========================================================

    @GetMapping("/my-reviews")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<ReviewerDto>> getMyReviews() {

        List<ReviewerDto> myReviews =
                reviewerService.getMyReviews();

        return ResponseEntity.ok(myReviews);
    }


    // =========================================================
    // ADMIN - VIEW ALL REVIEWS
    // =========================================================

    @GetMapping("/getAll")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ReviewerDto>> getAllReviewers() {

        List<ReviewerDto> reviewers =
                reviewerService.getAllReviewers();

        return ResponseEntity.ok(reviewers);
    }


    // =========================================================
    // ADMIN - VIEW REVIEW BY ID
    // =========================================================

    @GetMapping("/get/{reviewerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getReviewerById(
            @PathVariable Long reviewerId) {

        ReviewerDto reviewer =
                reviewerService.getReviewerById(reviewerId);

        if (reviewer == null) {

            return ResponseEntity.status(
                    HttpStatus.NOT_FOUND
            ).body(
                    Map.of(
                            "success", false,
                            "message", "Reviewer not found."
                    )
            );
        }

        return ResponseEntity.ok(reviewer);
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

            ReviewerDto updatedReviewer =
                    reviewerService.updateReviewer(
                            reviewerId,
                            reviewerDto
                    );

            if (updatedReviewer == null) {

                return ResponseEntity.status(
                        HttpStatus.NOT_FOUND
                ).body(
                        Map.of(
                                "success", false,
                                "message", "Reviewer not found."
                        )
                );
            }

            return ResponseEntity.ok(updatedReviewer);

        } catch (RuntimeException e) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
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
                    || reviewerDto.getAdminReply()
                            .trim()
                            .isEmpty()) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "success", false,
                                "message", "Admin reply is required."
                        )
                );
            }

            ReviewerDto updatedReviewer =
                    reviewerService.replyToReviewer(
                            reviewerId,
                            reviewerDto.getAdminReply()
                    );

            if (updatedReviewer == null) {

                return ResponseEntity.status(
                        HttpStatus.NOT_FOUND
                ).body(
                        Map.of(
                                "success", false,
                                "message", "Reviewer not found."
                        )
                );
            }

            return ResponseEntity.ok(updatedReviewer);

        } catch (RuntimeException e) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
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

            return ResponseEntity.status(
                    HttpStatus.NOT_FOUND
            ).body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }
}