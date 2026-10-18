package com.htc.insurance.security;

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

        this.jwtAuthenticationFilter =
                jwtAuthenticationFilter;
    }


    // =====================================================
    // SECURITY FILTER CHAIN
    // =====================================================

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http

            // -------------------------------------------------
            // CSRF
            // -------------------------------------------------

            .csrf(csrf -> csrf.disable())


            // -------------------------------------------------
            // CORS
            // -------------------------------------------------

            .cors(cors -> {})


            // -------------------------------------------------
            // STATELESS JWT
            // -------------------------------------------------

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )


            // -------------------------------------------------
            // AUTHORIZATION
            // -------------------------------------------------

            .authorizeHttpRequests(auth -> auth


                // =================================================
                // CORS PREFLIGHT
                // =================================================

                .requestMatchers(
                    HttpMethod.OPTIONS,
                    "/**"
                ).permitAll()


                // =================================================
                // AUTHENTICATION
                // =================================================

                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/send-otp",
                    "/api/auth/verify-otp",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password"
                ).permitAll()


                // =================================================
                // SWAGGER / OPENAPI
                // =================================================

                .requestMatchers(
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                ).permitAll()


                // =================================================
                // PUBLIC REGISTRATION
                // =================================================

                .requestMatchers(
                    HttpMethod.POST,
                    "/user/save"
                ).permitAll()


                // =================================================
                // FRONTEND STATIC RESOURCES
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
                // SESSION
                // =================================================

                .requestMatchers(
                    "/api/session"
                ).authenticated()


                // =================================================
                // PAYMENT
                // =================================================

                .requestMatchers(
                    "/payment/**"
                ).authenticated()


                // =================================================
                // POLICY PURCHASE
                // =================================================

                .requestMatchers(
                    "/policy/purchase"
                ).authenticated()


                // =================================================
                // EVERYTHING ELSE
                // =================================================

                .anyRequest().authenticated()
            )


            // -------------------------------------------------
            // JWT FILTER
            // -------------------------------------------------

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );


        return http.build();
    }


    // =====================================================
    // CORS CONFIGURATION
    // =====================================================

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();


        configuration.setAllowedOrigins(
            List.of(
                "http://127.0.0.1:5500",
                "http://localhost:5500",

                "http://127.0.0.1:5501",
                "http://localhost:5501",

                "http://localhost:5173",
                "http://127.0.0.1:5173",

                "http://localhost:8080",
                "http://127.0.0.1:8080"
            )
        );


        configuration.setAllowedMethods(
            List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
            )
        );


        configuration.setAllowedHeaders(
            List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin"
            )
        );


        configuration.setAllowCredentials(true);


        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();


        source.registerCorsConfiguration(
            "/**",
            configuration
        );


        return source;
    }


    // =====================================================
    // PASSWORD ENCODER
    // =====================================================

    @Bean
    public PasswordEncoder passwordEncoder() {

        return new BCryptPasswordEncoder();
    }


    // =====================================================
    // AUTHENTICATION MANAGER
    // =====================================================

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration)
            throws Exception {

        return configuration.getAuthenticationManager();
    }
}