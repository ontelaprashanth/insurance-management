# InsureX — Insurance Management System

A full-stack insurance management application built to streamline insurance policy management, customer registration, policy purchases, payment processing, claims handling, settlements, reviews, and notifications through a modern, responsive web interface.

## Overview

**InsureX** provides separate workspaces for customers and administrators. Customers can explore insurance plans, manage their policies, track claims, view payments, and receive notifications. Administrators can manage customers, policies, claims, settlements, and customer communications.

The application uses a React frontend, a Spring Boot REST API, and a MySQL database.

## Key Features

### Customer Portal
- Customer registration and authentication.
- Login using a username, email, or mobile number, depending on backend support.
- Browse available insurance plans.
- View policy details and purchase insurance.
- Access purchased policies and payment history.
- Submit and track insurance claims.
- View settlement information where authorized.
- Submit reviews and view responses.
- Receive and manage notifications.
- Update profile information and manage account security.

### Administrator Console
- Administrative dashboard and summary information.
- Customer and account management.
- Policy and policy-holder management.
- Policy purchase management.
- Claims review and status management.
- Settlement management and processing.
- Review management and responses.
- Broadcast notifications to customers.

### Authentication and Security
- Role-based access for `ADMIN` and `USER`.
- JWT-based authentication.
- Protected frontend routes.
- Session storage for the browser authentication token.
- Automatic authentication cleanup on applicable unauthorized API responses.
- Server-side authorization for protected operations.

> Security note: Actual access control must be enforced by the backend. Frontend route protection alone is not sufficient. Production deployments should also verify token expiry, resource ownership, payment signatures, and secure handling of sensitive customer data.

### Payment Processing
- Payment order creation.
- Payment verification through the backend.
- Integration support for Razorpay, subject to the configured credentials and implementation.
- Payment and purchase management.

### Responsive Interface
- Separate customer and administrator workspaces.
- Sidebar navigation.
- Responsive layouts for desktop, tablet, and mobile devices.
- Reusable interface components and API helpers.

## Technology Stack

### Frontend
- React
- JavaScript
- React Router
- TanStack Query
- Axios
- Lucide React
- Vite

### Backend
- Java 17
- Spring Boot 3.5.x
- Spring Security
- Spring Data JPA / Hibernate
- Maven
- JWT authentication
- RESTful APIs

### Database and Deployment
- MySQL 8
- Render for deployment
- GitHub for source-code management

## Application Architecture

```text
InsureX
│
├── Frontend (React + Vite)
│   ├── Public pages
│   ├── Authentication
│   ├── Customer portal
│   ├── Administrator console
│   ├── API client
│   └── Route protection
│
├── Backend (Spring Boot)
│   ├── Authentication and authorization
│   ├── User management
│   ├── Insurance plans and policies
│   ├── Purchases and payments
│   ├── Claims and settlements
│   ├── Reviews
│   └── Notifications
│
└── MySQL Database
    ├── Users
    ├── Policies
    ├── Claims
    ├── Settlements
    ├── Payments / purchases
    └── Reviews and notifications
```

The diagram describes the logical architecture. Actual table names and relationships depend on the backend entities and database configuration.

## Project Structure

The frontend structure includes:

```text
src/
├── api/
│   ├── client.js
│   └── endpoints.js
├── auth/
│   └── AuthContext.jsx
├── components/
│   ├── Layout.jsx
│   └── ui/
├── pages/
│   └── public/
├── lib/
├── App.jsx
├── main.jsx
└── styles.css
```

The backend follows a Spring Boot application structure with packages for controllers, services, repositories or DAOs, entities, DTOs, security, and configuration.

## Prerequisites

Install the following before running the application locally:

- Java Development Kit (JDK) 17
- Maven (or the included Maven Wrapper)
- MySQL 8
- Node.js and npm
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
```

Replace the placeholders with your actual repository URL and directory name.

### 2. Configure the MySQL database

Create the database:

```sql
CREATE DATABASE `htc-insurance`;
```

Configure the backend's `application.properties` or environment variables with your local database credentials.

Example local configuration:

```properties
spring.application.name=insurance-management

spring.datasource.url=jdbc:mysql://localhost:3306/htc-insurance
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

spring.jpa.hibernate.ddl-auto=update
```

Set `DB_USERNAME` and `DB_PASSWORD` in your local environment. Use a migration strategy and appropriate schema-management settings for production rather than relying on automatic schema updates.

### 3. Run the backend

Navigate to the backend directory containing `pom.xml`:

```bash
mvn spring-boot:run
```

Alternatively, on Windows, if the Maven Wrapper is present:

```bash
mvnw.cmd spring-boot:run
```

The local backend is expected to run at:

```text
http://localhost:8080
```

If Swagger/OpenAPI is configured, its UI may be available at:

```text
http://localhost:8080/swagger-ui/index.html
```

The exact endpoint depends on the backend configuration.

### 4. Configure the frontend

Navigate to the frontend directory containing `package.json`.

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8080
```

For a deployed frontend, configure `VITE_API_URL` to the deployed backend's base URL.

Do not put database credentials, private API keys, JWT signing secrets, or payment secrets in frontend environment variables. Vite variables prefixed with `VITE_` are exposed to the browser.

### 5. Install frontend dependencies

```bash
npm install
```

### 6. Start the frontend

```bash
npm run dev
```

Open the local URL printed by Vite, typically:

```text
http://localhost:5173
```

## Deployment

InsureX can be deployed as a frontend static site and a separate backend web service.

### Frontend
1. Connect the frontend repository or frontend directory to Render.
2. Configure the build command:

   ```bash
   npm install && npm run build
   ```

3. Set the publish directory to `dist`.
4. Set `VITE_API_URL` to the deployed backend base URL.
5. Configure a single-page application rewrite so direct React Router URLs serve `index.html`.

For Render static-site rewrites, use a rule equivalent to:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

### Backend
1. Deploy the Spring Boot service.
2. Configure database connectivity and required environment variables.
3. Configure CORS to allow the deployed frontend origin.
4. Configure JWT and payment credentials securely.
5. Confirm that the service can connect to its database and that required API endpoints are available.

The frontend and backend must use compatible API paths, authentication rules, and CORS settings.

## Configuration and Secrets

Never commit production secrets to GitHub.

Use environment variables or a secure secret manager for:
- Database credentials.
- JWT signing secrets.
- Razorpay keys and secrets.
- OTP provider credentials
