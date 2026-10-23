
package com.htc.insurance.dao;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Settlement;
import com.htc.insurance.repository.SettlementRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class SettlementDao {

    private final SettlementRepository repository;

    // =========================================================
    // SAVE SETTLEMENT
    // =========================================================

    public Settlement saveSettlement(Settlement settlement) {
        return repository.save(settlement);
    }

    // =========================================================
    // GET ALL SETTLEMENTS
    // =========================================================

    public List<Settlement> getAllSettlements() {
        return repository.findAll();
    }

    // =========================================================
    // GET SETTLEMENT BY ID
    // =========================================================

    public Settlement getSettlementById(Long settlementNumber) {
        return repository.findById(settlementNumber)
                .orElse(null);
    }

    // =========================================================
    // UPDATE SETTLEMENT
    // =========================================================

    public Settlement updateSettlement(Settlement settlement) {
        return repository.save(settlement);
    }

    // =========================================================
    // DELETE SETTLEMENT
    // =========================================================

    public void deleteSettlement(Long settlementNumber) {
        repository.deleteById(settlementNumber);
    }

    // =========================================================
    // GET SETTLEMENTS BY CLAIM NUMBER
    // =========================================================

    public List<Settlement> getSettlementsByClaimNumber(
            Long claimNumber) {

        return repository.findByClaim_ClaimNumber(claimNumber);
    }
}
