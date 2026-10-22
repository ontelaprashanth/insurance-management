
package com.htc.insurance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class InsuranceManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(
                InsuranceManagementApplication.class,
                args
        );
    }
}
