package com.htc.insurance.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.htc.insurance.dao.UserDao;
import com.htc.insurance.entity.User;

@Service
public class CustomUserDetailsService
        implements UserDetailsService {

    private final UserDao userDao;


    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public CustomUserDetailsService(
            UserDao userDao) {

        this.userDao = userDao;
    }


    // =========================================================
    // LOAD USER
    // =========================================================

    @Override
    public UserDetails loadUserByUsername(
            String username)
            throws UsernameNotFoundException {

        if (username == null
                || username.isBlank()) {

            throw new UsernameNotFoundException(
                    "Username is required."
            );
        }


        // =====================================================
        // FIND USER FROM DATABASE
        // =====================================================

        User user =
                userDao.getUserByUsername(
                        username.trim()
                );


        if (user == null) {

            throw new UsernameNotFoundException(
                    "User not found: " + username
            );
        }


        // =====================================================
        // VALIDATE ROLE
        // =====================================================

        String role =
                user.getRole();

        if (role == null
                || role.isBlank()) {

            throw new UsernameNotFoundException(
                    "User role is not configured."
            );
        }


        // =====================================================
        // NORMALIZE ROLE
        //
        // Database stores:
        // USER
        // ADMIN
        //
        // Spring Security roles become:
        // ROLE_USER
        // ROLE_ADMIN
        // =====================================================

        role =
                role.trim()
                        .toUpperCase()
                        .replace(
                                "ROLE_",
                                ""
                        );


        // =====================================================
        // VALIDATE SUPPORTED ROLES
        // =====================================================

        if (!role.equals("USER")
                && !role.equals("ADMIN")) {

            throw new UsernameNotFoundException(
                    "Unsupported user role: " + role
            );
        }


        // =====================================================
        // CREATE SPRING SECURITY USER
        // =====================================================

        return org.springframework.security.core.userdetails.User

                .withUsername(
                        user.getUsername()
                )

                .password(
                        user.getPassword()
                )

                .roles(
                        role
                )

                .disabled(
                        !Boolean.TRUE.equals(
                                user.getIsActive()
                        )
                )

                .build();
    }
}