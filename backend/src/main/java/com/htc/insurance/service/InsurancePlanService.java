
package com.htc.insurance.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class InsurancePlanSeeder implements ApplicationRunner {

    @Override
    public void run(ApplicationArguments args) {

        // Default insurance plan seeding is disabled.
        //
        // Existing plans in MySQL remain unchanged.
        // InsurancePlanService continues to provide
        // the active plan catalogue.
        //
        // Restore seeding when the default plan
        // definitions and persistence rules are ready.
    }
}
