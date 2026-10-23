
package com.htc.insurance.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.htc.insurance.dao.InsurancePlanDao;
import com.htc.insurance.entity.InsurancePlan;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InsurancePlanService {

    private final InsurancePlanDao insurancePlanDao;

    // =========================================================
    // GET ALL AVAILABLE INSURANCE PLANS
    // =========================================================

    @Transactional(readOnly = true)
    public List<InsurancePlan> getAvailablePlans() {

        return insurancePlanDao.findAvailablePlans();
    }
}
