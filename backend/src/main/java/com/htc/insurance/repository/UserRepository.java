package com.htc.insurance.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.htc.insurance.entity.User;

public interface UserRepository
        extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByContactNumber(String contactNumber);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByContactNumber(String contactNumber);

    boolean existsByRole(String role);
}