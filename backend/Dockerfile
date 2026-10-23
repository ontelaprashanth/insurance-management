
# =========================================================
# INSUREX - PRODUCTION DOCKERFILE
# Spring Boot 3.5.16 | Java 17 | Maven 3.9
# Render / Voroa Compatible
# =========================================================


# =========================================================
# STAGE 1 - MAVEN BUILD
# =========================================================

FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# ---------------------------------------------------------
# Verify Java and Maven versions
# ---------------------------------------------------------

RUN java -version && mvn -version


# ---------------------------------------------------------
# Copy Maven project configuration
# ---------------------------------------------------------

COPY pom.xml ./


# ---------------------------------------------------------
# Download dependencies for faster subsequent builds
# ---------------------------------------------------------

RUN mvn -B -DskipTests dependency:go-offline


# ---------------------------------------------------------
# Copy Spring Boot application source
# ---------------------------------------------------------

COPY src ./src


# ---------------------------------------------------------
# Clean build and display compiler diagnostics
# ---------------------------------------------------------

RUN mvn -B -e \
    -Dmaven.compiler.showWarnings=true \
    -DskipTests \
    clean package


# =========================================================
# STAGE 2 - PRODUCTION RUNTIME
# =========================================================

FROM eclipse-temurin:17-jre

WORKDIR /app


# ---------------------------------------------------------
# Copy Spring Boot executable JAR
# ---------------------------------------------------------

COPY --from=build /app/target/*.jar /app/app.jar


# ---------------------------------------------------------
# Default application port
# Hosting platform can override using PORT
# ---------------------------------------------------------

EXPOSE 3000


# ---------------------------------------------------------
# Start Spring Boot
# ---------------------------------------------------------

ENTRYPOINT ["sh", "-c", "exec java -XX:MaxRAMPercentage=60.0 -XX:+UseSerialGC -Dserver.port=${PORT:-3000} -Dserver.address=0.0.0.0 -jar /app/app.jar"]
