package com.htc.insurance.dao;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Reviewer;
import com.htc.insurance.repository.ReviewerRepository;

@Repository
public class ReviewerDao {

    @Autowired
    private ReviewerRepository repository;

    public Reviewer saveReviewer(Reviewer reviewer) {

        return repository.save(reviewer);
    }

    public List<Reviewer> getAllReviewers() {

        return repository.findAll();
    }

    public Reviewer getReviewerById(Long reviewerId) {

        return repository.findById(reviewerId)
                .orElse(null);
    }

    public Reviewer updateReviewer(Reviewer reviewer) {

        return repository.save(reviewer);
    }

    public void deleteReviewer(Long reviewerId) {

        repository.deleteById(reviewerId);
    }
}