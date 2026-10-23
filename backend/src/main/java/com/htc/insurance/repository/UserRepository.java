
package com.htc.insurance.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.htc.insurance.entity.User;

public interface UserRepository
        extends JpaRepository<User, Long> {

    // =========================================================
    // FIND USER BY USERNAME
    // =========================================================

    Optional<User> findByUsername(
            String username
    );

    // =========================================================
    // FIND USER BY EMAIL
    // =========================================================

    Optional<User> findByEmail(
            String email
    );

    // =========================================================
    // FIND USER BY MOBILE NUMBER
    // =========================================================

    Optional<User> findByContactNumber(
            String contactNumber
    );

    // =========================================================
    // CHECK EXISTING USERNAME
    // =========================================================

    boolean existsByUsername(
            String username
    );

    // =========================================================
    // CHECK EXISTING EMAIL
    // =========================================================

    boolean existsByEmail(
            String email
    );

    // =========================================================
    // CHECK EXISTING MOBILE NUMBER
    // =========================================================

    boolean existsByContactNumber(
            String contactNumber
    );

    // =========================================================
    // CHECK USER ROLE
    // =========================================================

    boolean existsByRole(
            String role
    );
}
