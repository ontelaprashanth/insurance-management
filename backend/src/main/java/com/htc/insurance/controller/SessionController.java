
package com.htc.insurance.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dao.UserDao;
import com.htc.insurance.entity.User;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class SessionController {

    private final UserDao userDao;

    // =========================================================
    // GET CURRENT AUTHENTICATED USER SESSION
    // =========================================================

    @GetMapping("/api/session")
    public Map<String, Object> getSession(
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        // =====================================================
        // AUTHENTICATION DETAILS
        // =====================================================

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new org.springframework.security.access
                    .AccessDeniedException(
                            "Authentication is required."
                    );
        }

        String username = authentication.getName();

        response.put("username", username);

        // Resolve role from Spring Security authorities.
        response.put(
                "role",
                authentication.getAuthorities()
                        .stream()
                        .map(GrantedAuthority::getAuthority)
                        .filter(authority ->
                                authority.startsWith("ROLE_"))
                        .map(authority ->
                                authority.substring(5))
                        .findFirst()
                        .orElse(null)
        );

        // =====================================================
        // LOAD USER DETAILS FROM DATABASE
        // =====================================================

        User user = userDao.getUserByUsername(username);

        if (user == null) {
            return response;
        }

        // =====================================================
        // BASIC USER DETAILS
        // =====================================================

        response.put("userId", user.getUserId());
        response.put("isActive", user.getIsActive());
        response.put("createdAt", user.getCreatedAt());
        response.put("expiryDate", user.getExpiryDate());

        // =====================================================
        // PROFILE DETAILS
        // =====================================================

        response.put("contactNumber", user.getContactNumber());
        response.put("occupation", user.getOccupation());
        response.put("income", user.getIncome());

        // =====================================================
        // EXISTING USER DETAILS
        // =====================================================

        response.put("aadharNumber", user.getAadharNumber());
        response.put("bankName", user.getBankName());
        response.put("accountNumber", user.getAccountNumber());
        response.put("ifscCode", user.getIfscCode());

        return response;
    }
}
