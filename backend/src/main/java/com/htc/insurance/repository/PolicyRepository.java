package com.htc.insurance.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.htc.insurance.entity.Policy;

public interface PolicyRepository extends JpaRepository<Policy, Long> {

}