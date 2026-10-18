package com.htc.insurance.dao;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Settlement;
import com.htc.insurance.repository.SettlementRepository;

@Repository
public class SettlementDao {

    @Autowired
    private SettlementRepository repository;


    public Settlement saveSettlement(Settlement settlement) {
        return repository.save(settlement);
    }


    public List<Settlement> getAllSettlements() {
        return repository.findAll();
    }


    public Settlement getSettlementById(Long settlementNumber) {

        return repository.findById(settlementNumber)
                .orElse(null);
    }


    public Settlement updateSettlement(Settlement settlement) {
        return repository.save(settlement);
    }


    public void deleteSettlement(Long settlementNumber) {
        repository.deleteById(settlementNumber);
    }


    public List<Settlement> getSettlementsByClaimNumber(
            Long claimNumber) {

        return repository.findByClaim_ClaimNumber(claimNumber);
    }
}