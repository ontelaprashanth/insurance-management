package com.htc.insurance.dao;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.htc.insurance.entity.Claims;
import com.htc.insurance.repository.ClaimsRepository;

@Repository
public class ClaimsDao {

    @Autowired
    private ClaimsRepository repository;


    public Claims saveClaims(
            Claims claims) {

        return repository.save(
                claims
        );
    }


    public List<Claims> getAllClaims() {

        return repository.findAll();
    }


    public Claims getClaimsById(
            Long claimNumber) {

        return repository
                .findById(claimNumber)
                .orElse(null);
    }


    public Claims updateClaims(
            Claims claims) {

        return repository.save(
                claims
        );
    }


    public void deleteClaims(
            Long claimNumber) {

        repository.deleteById(
                claimNumber
        );
    }
}