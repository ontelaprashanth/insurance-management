package com.htc.insurance.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/")
    public Map<String, String> home() {
        return Map.of(
            "application", "InsureX",
            "status", "UP",
            "message", "Insurance Management API is running"
        );
    }
}
