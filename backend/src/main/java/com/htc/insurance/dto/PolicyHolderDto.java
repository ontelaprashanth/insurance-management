package com.htc.insurance.dto;

import java.time.LocalDate;

import lombok.Data;

@Data
public class PolicyHolderDto {

    private Long policyHolderId;

    private String name;

    private LocalDate dob;

    private Long userId;
}