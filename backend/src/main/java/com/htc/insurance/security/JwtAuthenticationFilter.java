
package com.htc.insurance.security;

import java.io.IOException;

import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    // =========================================================
    // DEPENDENCIES
    // =========================================================

    private final JwtService jwtService;

    private final UserDetailsService userDetailsService;

    // =========================================================
    // SKIP JWT PROCESSING FOR RAZORPAY WEBHOOK
    // =========================================================

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request)
            throws ServletException {

        /*
         * Razorpay sends a signed webhook request,
         * not a customer JWT.
         *
         * The controller verifies the webhook signature.
         *
         * Other endpoints retain their existing JWT behavior.
         */

        return HttpMethod.POST.matches(request.getMethod())
                && "/webhooks/razorpay".equals(
                        request.getServletPath()
                );
    }

    // =========================================================
    // JWT AUTHENTICATION FILTER
    // =========================================================

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader =
                request.getHeader("Authorization");

        // =====================================================
        // NO BEARER TOKEN
        // =====================================================

        /*
         * Public endpoints continue normally.
         *
         * Protected endpoints are rejected later
         * by Spring Security authorization.
         */

        if (authHeader == null
                || !authHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        // =====================================================
        // EXTRACT TOKEN
        // =====================================================

        String token =
                authHeader.substring(7).trim();

        if (token.isEmpty()) {

            filterChain.doFilter(request, response);
            return;
        }

        try {

            // =================================================
            // EXTRACT USERNAME
            // =================================================

            String username =
                    jwtService.extractUsername(token);

            if (username == null
                    || username.isBlank()) {

                filterChain.doFilter(request, response);
                return;
            }

            // =================================================
            // CHECK EXISTING AUTHENTICATION
            // =================================================

            if (SecurityContextHolder
                    .getContext()
                    .getAuthentication() != null) {

                filterChain.doFilter(request, response);
                return;
            }

            // =================================================
            // LOAD USER DETAILS
            // =================================================

            UserDetails userDetails =
                    userDetailsService.loadUserByUsername(username);

            // =================================================
            // VALIDATE JWT
            // =================================================

            boolean valid =
                    jwtService.isTokenValid(token, username);

            if (!valid) {

                SecurityContextHolder.clearContext();

                filterChain.doFilter(request, response);
                return;
            }

            // =================================================
            // CREATE AUTHENTICATION
            // =================================================

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

            authentication.setDetails(
                    new WebAuthenticationDetailsSource()
                            .buildDetails(request)
            );

            // =================================================
            // SET SECURITY CONTEXT
            // =================================================

            SecurityContextHolder
                    .getContext()
                    .setAuthentication(authentication);

        } catch (Exception e) {

            /*
             * Invalid or expired JWT.
             *
             * Do not expose token parsing details.
             * Spring Security handles authorization.
             */

            SecurityContextHolder.clearContext();
        }

        // =====================================================
        // CONTINUE FILTER CHAIN
        // =====================================================

        filterChain.doFilter(request, response);
    }
}
