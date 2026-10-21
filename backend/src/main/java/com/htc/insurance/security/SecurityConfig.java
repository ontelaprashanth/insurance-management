
package com.htc.insurance.security;

import java.util.ArrayList;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    // =========================================================
    // SPRING SECURITY FILTER CHAIN
    // =========================================================

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .cors(cors -> {})

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS)
            )

            .authorizeHttpRequests(auth -> auth

                // =================================================
                // CORS PREFLIGHT
                // =================================================

                .requestMatchers(
                    HttpMethod.OPTIONS,
                    "/**"
                ).permitAll()

                // =================================================
                // PUBLIC AUTHENTICATION ENDPOINTS
                // =================================================

                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/send-otp",
                    "/api/auth/verify-otp",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password"
                ).permitAll()

                // =================================================
                // SWAGGER
                // =================================================

                .requestMatchers(
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                ).permitAll()

                // =================================================
                // PUBLIC USER REGISTRATION
                // =================================================

                .requestMatchers(
                    HttpMethod.POST,
                    "/user/save"
                ).permitAll()

                // =================================================
                // PUBLIC STATIC FILES
                // =================================================

                .requestMatchers(
                    "/",
                    "/index.html",
                    "/login.html",
                    "/dashboard.html",
                    "/admin.html",
                    "/user.html",
                    "/users.html",
                    "/policyholders.html",
                    "/policies.html",
                    "/claims.html",
                    "/reviewers.html",
                    "/settlements.html",
                    "/profile.html",
                    "/my-policies.html",
                    "/my-claims.html",
                    "/support.html",
                    "/css/**",
                    "/js/**"
                ).permitAll()

                // =================================================
                // RAZORPAY WEBHOOK
                // =================================================

                /*
                 * Razorpay does not send the customer's JWT.
                 *
                 * This endpoint is public at the Spring Security
                 * authorization layer.
                 *
                 * RazorpayWebhookController independently verifies
                 * the HMAC-SHA256 webhook signature.
                 */
                .requestMatchers(
                    HttpMethod.POST,
                    "/webhooks/razorpay"
                ).permitAll()

                // =================================================
                // AUTHENTICATED SESSION
                // =================================================

                .requestMatchers(
                    "/api/session"
                ).authenticated()

                // =================================================
                // AUTHENTICATED PAYMENT ENDPOINTS
                // =================================================

                .requestMatchers(
                    "/payment/**"
                ).authenticated()

                // =================================================
                // AUTHENTICATED POLICY PURCHASE
                // =================================================

                .requestMatchers(
                    "/policy/purchase"
                ).authenticated()

                // =================================================
                // ALL REMAINING ENDPOINTS
                // =================================================

                .anyRequest().authenticated()
            )

            // =====================================================
            // JWT FILTER
            // =====================================================

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    // =========================================================
    // CORS CONFIGURATION
    // =========================================================

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        List<String> allowedOrigins = new ArrayList<>(List.of(

            // Production Vercel frontend
            "https://insurex-insurace-ibdr.vercel.app",

            // Vite development
            "http://localhost:5173",
            "http://127.0.0.1:5173",

            // Local static frontend
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:5501",
            "http://127.0.0.1:5501",

            // Local backend
            "http://localhost:8080",
            "http://127.0.0.1:8080"
        ));

        // =====================================================
        // OPTIONAL FRONTEND ORIGIN FROM ENVIRONMENT
        // =====================================================

        String frontendUrl = System.getenv("FRONTEND_URL");

        if (frontendUrl != null && !frontendUrl.isBlank()) {

            String normalizedUrl = frontendUrl
                    .trim()
                    .replaceAll("/+$", "");

            if (!normalizedUrl.isBlank()
                    && !allowedOrigins.contains(normalizedUrl)) {

                allowedOrigins.add(normalizedUrl);
            }
        }

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(allowedOrigins);

        configuration.setAllowedMethods(List.of(
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
            "OPTIONS"
        ));

        configuration.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin"
        ));

        configuration.setAllowCredentials(true);

        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration
        );

        return source;
    }

    // =========================================================
    // PASSWORD ENCODER
    // =========================================================

    @Bean
    public PasswordEncoder passwordEncoder() {

        return new BCryptPasswordEncoder();
    }

    // =========================================================
    // AUTHENTICATION MANAGER
    // =========================================================

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration)
            throws Exception {

        return configuration.getAuthenticationManager();
    }
}
