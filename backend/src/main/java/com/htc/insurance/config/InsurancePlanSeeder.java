
package com.htc.insurance.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class InsurancePlanSeeder implements ApplicationRunner {

    @Override
    public void run(ApplicationArguments args) {
        // Automatic plan seeding is disabled.
        // Existing insurance plans remain unchanged.
    }
}
