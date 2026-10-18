package com.htc.insurance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Claims;

@Repository
public interface ClaimsRepository
        extends JpaRepository<Claims, Long> {
}