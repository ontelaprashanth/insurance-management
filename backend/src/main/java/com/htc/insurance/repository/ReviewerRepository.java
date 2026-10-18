package com.htc.insurance.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.htc.insurance.entity.Reviewer;

public interface ReviewerRepository
        extends JpaRepository<Reviewer, Long> {

}