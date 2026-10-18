package com.htc.insurance.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.htc.insurance.dao.UserDao;
import com.htc.insurance.entity.User;

import jakarta.servlet.http.HttpSession;

@RestController
public class SessionController {

    private final UserDao userDao;

    public SessionController(UserDao userDao) {
        this.userDao = userDao;
    }

    @GetMapping("/api/session")
    public Map<String, Object> getSession(
            HttpSession session,
            Authentication authentication) {

        Map<String, Object> response =
                new HashMap<>();

        // ==============================
        // SESSION ID
        // ==============================

        response.put(
                "sessionId",
                session.getId()
        );

        // ==============================
        // LOGGED-IN USERNAME
        // ==============================

        String username =
                authentication.getName();

        response.put(
                "username",
                username
        );

        // Return the server-side role so the frontend can display
        // the current database authority instead of trusting only
        // the role claim cached in an older JWT.
        response.put(
                "role",
                authentication.getAuthorities()
                        .stream()
                        .findFirst()
                        .map(a -> a.getAuthority().replace("ROLE_", ""))
                        .orElse(null)
        );

        // ==============================
        // GET USER FROM DATABASE
        // ==============================

        User user =
                userDao.getUserByUsername(username);

        if (user != null) {

            // ==============================
            // BASIC USER DETAILS
            // ==============================

            response.put(
                    "userId",
                    user.getUserId()
            );

            response.put(
                    "isActive",
                    user.getIsActive()
            );

            // ==============================
            // CREATED DATE
            // ==============================

            response.put(
                    "createdAt",
                    user.getCreatedAt()
            );

            // ==============================
            // EXPIRY DATE
            // ==============================

            response.put(
                    "expiryDate",
                    user.getExpiryDate()
            );

            // ==============================
            // OTHER USER DETAILS
            // ==============================

            response.put(
                    "contactNumber",
                    user.getContactNumber()
            );

            response.put(
                    "occupation",
                    user.getOccupation()
            );

            response.put(
                    "income",
                    user.getIncome()
            );

            response.put(
                    "aadharNumber",
                    user.getAadharNumber()
            );

            response.put(
                    "bankName",
                    user.getBankName()
            );

            response.put(
                    "accountNumber",
                    user.getAccountNumber()
            );

            response.put(
                    "ifscCode",
                    user.getIfscCode()
            );
        }

        return response;
    }
}