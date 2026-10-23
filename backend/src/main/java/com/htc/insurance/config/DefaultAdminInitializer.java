package com.htc.insurance.config;

import java.time.LocalDateTime;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.htc.insurance.entity.User;
import com.htc.insurance.repository.UserRepository;

@Component
public class DefaultAdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DefaultAdminInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {

        // If an ADMIN already exists, do nothing
        if (userRepository.existsByRole("ADMIN")) {
            System.out.println("DEFAULT ADMIN CHECK: Admin already exists.");
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        User admin = new User();

        admin.setUsername("prashanth reddy");
        admin.setEmail("prashanth.reddy@insurex.com");
        admin.setPassword(passwordEncoder.encode("Admin@123"));

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

        System.out.println("==========================================");
        System.out.println("DEFAULT ADMIN CREATED");
        System.out.println("Username : prashanth reddy");
        System.out.println("Password : Admin@123");
        System.out.println("Role     : ADMIN");
        System.out.println("==========================================");
    }
}
