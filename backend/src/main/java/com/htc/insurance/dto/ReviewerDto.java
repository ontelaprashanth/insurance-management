
package com.htc.insurance.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ReviewerDto {

    // =========================================================
    // REVIEW INFORMATION
    // =========================================================

    private Long reviewerId;

    private String name;

    private String email;

    private String contactNumber;

    private Integer rating;

    private String review;

    // =========================================================
    // ADMIN RESPONSE
    // =========================================================

    private String adminReply;

    private String status;

    // =========================================================
    // USER AND CLAIM REFERENCES
    // =========================================================

    private Long userId;

    private Long claimNumber;
}
