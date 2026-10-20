
# =========================================================
# INSUREX - MULTI-STAGE DOCKER BUILD
# Java 17 + Spring Boot + Maven
# =========================================================

# -------------------------
# STAGE 1: BUILD
# -------------------------
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy Maven configuration
COPY pom.xml .

# Download dependencies first for better Docker layer caching
RUN mvn -B -DskipTests dependency:go-offline

# Copy application source
COPY src ./src

# Build executable Spring Boot JAR
RUN mvn -B -DskipTests package


# -------------------------
# STAGE 2: RUNTIME
# -------------------------
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy packaged application
COPY --from=build /app/target/*.jar app.jar

# Default port; hosting platform can override with PORT
ENV PORT=8080

# Document the default application port
EXPOSE 8080

# Start Spring Boot on the hosting platform's assigned port
ENTRYPOINT ["sh", "-c", "exec java -Dserver.port=${PORT:-8080} -Dserver.address=0.0.0.0 -jar /app/app.jar"]
