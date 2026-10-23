
package com.htc.insurance.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class InsurancePlanSeeder implements ApplicationRunner {

    // =========================================================
    // APPLICATION STARTUP
    // =========================================================

    @Override
    public void run(ApplicationArguments args) {

        /*
         * Default insurance plan seeding is disabled.
         *
         * Existing insurance plans in MySQL remain unchanged.
         *
         * InsurancePlanService continues to provide
         * the active insurance plan catalogue.
         *
         * Restore seeding only when default plan
         * definitions and persistence rules are ready.
         */
    }
}
