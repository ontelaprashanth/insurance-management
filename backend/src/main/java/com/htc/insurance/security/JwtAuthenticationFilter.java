package com.htc.insurance.security;

import java.io.IOException;

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

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserDetailsService userDetailsService) {

        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

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
        //
        // Public endpoints can continue normally.
        // Protected endpoints will be rejected later by
        // Spring Security authorization.
        // =====================================================

        if (authHeader == null
                || !authHeader.startsWith("Bearer ")) {

            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }


        // =====================================================
        // EXTRACT TOKEN
        // =====================================================

        String token =
                authHeader.substring(7).trim();

        if (token.isEmpty()) {

            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }


        try {

            // =================================================
            // EXTRACT USERNAME FROM JWT
            // =================================================

            String username =
                    jwtService.extractUsername(token);

            if (username == null
                    || username.isBlank()) {

                filterChain.doFilter(
                        request,
                        response
                );

                return;
            }


            // =================================================
            // ONLY AUTHENTICATE IF CONTEXT IS EMPTY
            // =================================================

            if (SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    != null) {

                filterChain.doFilter(
                        request,
                        response
                );

                return;
            }


            // =================================================
            // LOAD USER
            // =================================================

            UserDetails userDetails =
                    userDetailsService
                            .loadUserByUsername(username);


            // =================================================
            // VALIDATE JWT
            // =================================================

            boolean valid =
                    jwtService.isTokenValid(
                            token,
                            username
                    );

            if (!valid) {

                SecurityContextHolder
                        .clearContext();

                filterChain.doFilter(
                        request,
                        response
                );

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
                    .setAuthentication(
                            authentication
                    );


        } catch (Exception e) {

            // =================================================
            // INVALID JWT
            //
            // Do not expose JWT parsing details to the client.
            // Spring Security will handle authorization.
            // =================================================

            SecurityContextHolder
                    .clearContext();
        }


        // =====================================================
        // CONTINUE REQUEST
        // =====================================================

        filterChain.doFilter(
                request,
                response
        );
    }
}