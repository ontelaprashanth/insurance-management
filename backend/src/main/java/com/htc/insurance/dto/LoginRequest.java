
package com.htc.insurance.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class LoginRequest {

    // =====================================================
    // USERNAME / EMAIL / MOBILE NUMBER
    // =====================================================

    private String identifier;

    // =====================================================
    // PASSWORD
    // =====================================================

    private String password;
}
