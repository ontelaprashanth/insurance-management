package com.htc.insurance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RefundRequestDto {

    @NotNull(message = "Purchase ID is required")
    private Long purchaseId;

    @NotBlank(message = "Refund reason is required")
    @Size(
        max = 500,
        message = "Refund reason must not exceed 500 characters"
    )
    private String refundReason;
}
