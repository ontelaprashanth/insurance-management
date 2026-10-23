
package com.htc.insurance.config;

import java.time.LocalDateTime;

import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.htc.insurance.entity.User;
import com.htc.insurance.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DefaultAdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${insurex.admin.username:}")
    private String adminUsername;

    @Value("${insurex.admin.email:}")
    private String adminEmail;

    @Value("${insurex.admin.password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {

        if (userRepository.existsByRole("ADMIN")) {
            return;
        }

        if (adminUsername.isBlank()
                || adminEmail.isBlank()
                || adminPassword.isBlank()) {

            System.out.println(
                "Default admin creation skipped: credentials not configured."
            );
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        User admin = new User();

        admin.setUsername(adminUsername);
        admin.setEmail(adminEmail);
        admin.setPassword(passwordEncoder.encode(adminPassword));

        admin.setRole("ADMIN");
        admin.setIsActive(true);

        admin.setCreatedAt(now);
        admin.setExpiryDate(now.plusYears(1));

        admin.setContactNumber("9999999999");
        admin.setOccupation("Insurance Administrator");
        admin.setIncome(0.0);

        admin.setAadharNumber("000000000000");
        admin.setBankName("InsureX");
        admin.setAccountNumber("000000000000");
        admin.setIfscCode("INSU0000000");

        userRepository.save(admin);

        System.out.println("Default admin account created successfully.");
    }
}
