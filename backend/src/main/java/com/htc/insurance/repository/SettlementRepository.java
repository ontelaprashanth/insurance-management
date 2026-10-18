package com.htc.insurance.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.htc.insurance.entity.Settlement;

public interface SettlementRepository
        extends JpaRepository<Settlement, Long> {

    List<Settlement> findByClaim_ClaimNumber(
            Long claimNumber
    );
}