package com.htc.insurance.dto;

import lombok.Data;

@Data
public class ReviewerDto {

    private Long reviewerId;

    private String name;

    private String email;

    private String contactNumber;

    private Integer rating;

    private String review;

    private String adminReply;

    private String status;

    private Long userId;

    private Long claimNumber;
}