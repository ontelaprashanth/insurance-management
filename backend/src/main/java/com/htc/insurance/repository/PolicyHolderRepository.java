package com.htc.insurance.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.htc.insurance.entity.PolicyHolder;

public interface PolicyHolderRepository
        extends JpaRepository<PolicyHolder, Long> {

    Optional<PolicyHolder> findByUserUsername(String username);
}