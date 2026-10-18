package com.htc.insurance.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey key;

    private final long expirationTime;


    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration:3600000}") long expirationTime) {

        if (secret == null || secret.length() < 32) {
            throw new IllegalArgumentException(
                    "JWT secret must contain at least 32 characters."
            );
        }

        this.key =
                Keys.hmacShaKeyFor(
                        secret.getBytes(StandardCharsets.UTF_8)
                );

        this.expirationTime =
                expirationTime;
    }


    // =========================================================
    // GENERATE JWT TOKEN
    // =========================================================

    public String generateToken(
            String username,
            String role) {

        return Jwts.builder()

                .subject(username)

                .claim("role", role)

                .issuedAt(new Date())

                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + expirationTime
                        )
                )

                .signWith(key)

                .compact();
    }


    // =========================================================
    // EXTRACT USERNAME
    // =========================================================

    public String extractUsername(
            String token) {

        Claims claims =
                Jwts.parser()

                        .verifyWith(key)

                        .build()

                        .parseSignedClaims(token)

                        .getPayload();

        return claims.getSubject();
    }


    // =========================================================
    // EXTRACT ROLE
    // =========================================================

    public String extractRole(
            String token) {

        Claims claims =
                Jwts.parser()

                        .verifyWith(key)

                        .build()

                        .parseSignedClaims(token)

                        .getPayload();

        return claims.get(
                "role",
                String.class
        );
    }


    // =========================================================
    // VALIDATE JWT TOKEN
    // =========================================================

    public boolean isTokenValid(
            String token) {

        try {

            Jwts.parser()

                    .verifyWith(key)

                    .build()

                    .parseSignedClaims(token);

            return true;

        } catch (Exception e) {

            return false;
        }
    }


    // =========================================================
    // VALIDATE TOKEN FOR SPECIFIC USER
    // =========================================================

    public boolean isTokenValid(
            String token,
            String username) {

        try {

            String tokenUsername =
                    extractUsername(token);

            return username != null
                    && tokenUsername != null
                    && tokenUsername.equals(username)
                    && isTokenValid(token);

        } catch (Exception e) {

            return false;
        }
    }
}