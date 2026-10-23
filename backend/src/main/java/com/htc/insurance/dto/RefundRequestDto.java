
package com.htc.insurance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.Data;

@Data
public class RefundRequestDto {

    // =========================================================
    // PURCHASE ID
    // =========================================================

    /**
     * Optional for the existing URL-based refund endpoint.
     * Retained for compatibility with other callers.
     */
    private Long purchaseId;

    // =========================================================
    // REFUND REASON
    // =========================================================

    @NotBlank(message = "Refund reason is required.")
    @Size(
        max = 500,
        message = "Refund reason must not exceed 500 characters."
    )
    private String refundReason;
}
