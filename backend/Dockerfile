
# =========================================================
# INSUREX - MULTI-STAGE DOCKER BUILD
# Java 17 + Spring Boot + Maven
# Voroa-compatible deployment
# =========================================================

# -------------------------
# STAGE 1: BUILD
# -------------------------
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src

RUN mvn -B -DskipTests package


# -------------------------
# STAGE 2: RUNTIME
# -------------------------
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/*.jar /app/app.jar

# Voroa provides PORT=3000 for Docker web services
EXPOSE 3000

# Start Spring Boot on the platform-provided port
ENTRYPOINT ["sh", "-c", "exec java -XX:MaxRAMPercentage=60.0 -XX:+UseSerialGC -Dserver.port=${PORT:-3000} -Dserver.address=0.0.0.0 -jar /app/app.jar"]
