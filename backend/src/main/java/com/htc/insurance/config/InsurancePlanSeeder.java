
package com.htc.insurance.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.htc.insurance.service.InsurancePlanService;

@Component
public class InsurancePlanSeeder implements ApplicationRunner {

    private final InsurancePlanService insurancePlanService;

    public InsurancePlanSeeder(
            InsurancePlanService insurancePlanService) {
        this.insurancePlanService = insurancePlanService;
    }

    @Override
    public void run(ApplicationArguments args) {
        // Default plan seeding is temporarily disabled.
        // Existing insurance plans remain in the database.
    }
}
