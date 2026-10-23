
package com.htc.insurance.entity;

import java.time.LocalDate;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "policy_holder")
@Getter
@Setter
@NoArgsConstructor
public class PolicyHolder {

    // =========================================================
    // PRIMARY KEY
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long policyHolderId;

    // =========================================================
    // POLICY HOLDER DETAILS
    // =========================================================

    private String name;

    private LocalDate dob;

    // =========================================================
    // USER RELATIONSHIP
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    // =========================================================
    // POLICIES RELATIONSHIP
    // =========================================================

    @OneToMany(mappedBy = "policyHolder")
    private List<Policy> policies;
}
