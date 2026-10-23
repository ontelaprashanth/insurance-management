
package com.htc.insurance.dao;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Reviewer;
import com.htc.insurance.repository.ReviewerRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ReviewerDao {

    private final ReviewerRepository repository;

    // =========================================================
    // SAVE REVIEW
    // =========================================================

    public Reviewer saveReviewer(Reviewer reviewer) {
        return repository.save(reviewer);
    }

    // =========================================================
    // GET ALL REVIEWS
    // =========================================================

    public List<Reviewer> getAllReviewers() {
        return repository.findAll();
    }

    // =========================================================
    // GET REVIEW BY ID
    // =========================================================

    public Reviewer getReviewerById(Long reviewerId) {
        return repository.findById(reviewerId)
                .orElse(null);
    }

    // =========================================================
    // UPDATE REVIEW
    // =========================================================

    public Reviewer updateReviewer(Reviewer reviewer) {
        return repository.save(reviewer);
    }

    // =========================================================
    // DELETE REVIEW
    // =========================================================

    public void deleteReviewer(Long reviewerId) {
        repository.deleteById(reviewerId);
    }
}
