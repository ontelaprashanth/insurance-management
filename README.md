# 🛡️ InsureX — Insurance Management System

**A full-stack insurance management platform built with React, Spring Boot, Java, and MySQL.**

InsureX simplifies insurance management by bringing customers and administrators together on one secure, responsive platform. Customers can explore insurance plans, purchase policies, manage payments, submit claims, track settlements, and receive notifications. Administrators can manage customers, policies, claims, settlements, reviews, and customer communications.

---

## 🌐 Live Demo

Experience the deployed InsureX application.

| Service | Link |
|---|---|
| **Live Application** | [Open InsureX Website](https://insurance-management-frontend-jsp3.onrender.com) |
| **Backend API** | [Open InsureX Backend](https://insurance-management-ke8b.onrender.com) |
| **Swagger API Documentation** | [Open Swagger UI](https://insurance-management-ke8b.onrender.com/swagger-ui/index.html) |
| **GitHub Repository** | Add your repository URL here |

> These are the configured deployment URLs. Availability of the application, backend, and Swagger documentation depends on the current deployment status and backend configuration.

---

## 📌 Project Overview

InsureX is designed to digitize common insurance operations through an intuitive web interface and RESTful backend services.

The application provides separate customer and administrator workspaces, supports role-based access, and organizes insurance-related activities into a unified management system.

### Project Objectives

- Simplify insurance policy discovery and management.
- Provide customers with access to their insurance information.
- Streamline claims review and settlement workflows.
- Integrate online payment processing.
- Improve communication through notifications.
- Provide administrators with centralized management tools.
- Deliver a responsive interface across desktop, tablet, and mobile devices.

---

## ✨ Key Features

### 👤 Customer Portal

- Customer registration and login.
- Authentication using a username, email, or mobile number, subject to backend support.
- Browse available insurance plans.
- View policy details and purchase insurance.
- Access purchased policies and payment information.
- Submit insurance claims and track claim status.
- View settlement information where authorized.
- Submit reviews and view administrator responses.
- Receive and manage notifications.
- Manage profile information.
- Access protected customer pages.

### 🛠️ Administrator Console

- Administrative dashboard.
- Customer account management.
- Activate, deactivate, and manage users.
- Policy and policy-holder management.
- Policy purchase management.
- Review and update insurance claims.
- Approve or reject claims according to configured rules.
- Manage insurance settlements.
- Process or reject settlements.
- Manage customer reviews and responses.
- Send broadcast notifications to customers.
- View relevant operational information.

### 🔐 Authentication and Security

- JWT-based authentication.
- Role-based access for `ADMIN` and `USER`.
- Protected frontend routes.
- Authentication token stored in browser `sessionStorage`.
- Session restoration after page refresh.
- Logout clears the local authentication token and application query cache.
- Unauthorized API responses trigger authentication cleanup.
- Backend authorization for protected operations.

> **Security note:** Frontend route protection is not a substitute for backend authorization. Production security also requires token-expiry enforcement, resource-ownership checks, secure handling of personal information, and proper payment verification.

### 💳 Payment Management

- Create payment orders.
- Verify payments through the backend.
- Support for Razorpay integration, depending on configured credentials and implementation.
- Manage purchase and payment records.
- Provide a foundation for payment history and receipts.

### 📋 Claims and Settlements

- Submit and manage insurance claims.
- Review claim information.
- Approve or reject claims, subject to authorization and business rules.
- Associate settlements with claims.
- Record settlement amounts and dates.
- Manage settlement status.
- Provide a foundation for end-to-end claim and settlement tracking.

### 🔔 Notifications and Reviews

- Customer notification center.
- Unread notification count.
- Mark notifications as read.
- Mark all notifications as read.
- Remove notifications.
- Administrator broadcast notifications.
- Customer reviews and administrator responses.

### 📱 Responsive User Interface

- Separate customer and administrator navigation.
- Reusable React UI components.
- Responsive page layouts.
- Consistent navigation and styling.
- Mobile-friendly sidebar navigation.
- Loading, error, and empty-state handling where implemented.

---

## 🖼️ Application Screenshots

Screenshots will be added to the `screenshots/` directory.

### Public Website and Authentication

| Landing Page | Login |
|---|---|
| ![InsureX Landing Page](screenshots/landing-page.png) | ![InsureX Login](screenshots/login.png) |

### Customer Portal

| Customer Dashboard | Insurance Plans |
|---|---|
| ![Customer Dashboard](screenshots/customer-dashboard.png) | ![Insurance Plans](screenshots/insurance-plans.png) |

| My Policies | Claims Management |
|---|---|
| ![My Policies](screenshots/my-policies.png) | ![Claims Management](screenshots/claims.png) |

| Payments | Notifications |
|---|---|
| ![Payments](screenshots/payments.png) | ![Notifications](screenshots/notifications.png) |

### Administrator Console

| Admin Dashboard | User Management |
|---|---|
| ![Admin Dashboard](screenshots/admin-dashboard.png) | ![User Management](screenshots/admin-users.png) |

| Policy Management | Settlement Management |
|---|---|
| ![Policy Management](screenshots/admin-policies.png) | ![Settlement Management](screenshots/admin-settlements.png) |

> Upload the actual screenshots using these filenames, or update the image paths to match your chosen filenames. The screenshot gallery will not display correctly until the corresponding files exist in the repository.

---

## 🧰 Technology Stack

### Frontend

- **React** — component-based user interface.
- **JavaScript** — application logic.
- **Vite** — development server and build tooling.
- **React Router** — client-side routing.
- **TanStack Query** — server-state and API data management.
- **Axios** — HTTP communication with the backend.
- **Lucide React** — interface icons.
- **CSS** — responsive application styling.

### Backend

- **Java 17** — application programming language.
- **Spring Boot 3.5.x** — backend application framework.
- **Spring Security** — authentication and authorization.
- **Spring Data JPA** — database persistence.
- **Hibernate** — object-relational mapping.
- **Maven** — dependency management and build automation.
- **JWT** — token-based authentication.
- **REST APIs** — communication between frontend and backend.

### Database and Hosting

- **MySQL 8** — relational database.
- **Render** — application hosting.
- **GitHub** — source control and project collaboration.

---

## 🏗️ Application Architecture

```text
InsureX Insurance Management System
│
├── React Frontend
│   ├── Public Website
│   ├── Authentication
│   ├── Customer Portal
│   ├── Administrator Console
│   ├── API Client
│   └── Protected Routes
│
├── Spring Boot Backend
│   ├── Authentication and Authorization
│   ├── User Management
│   ├── Insurance Plans and Policies
│   ├── Purchases and Payments
│   ├── Claims Management
│   ├── Settlement Management
│   ├── Reviews
│   └── Notifications
│
└── MySQL Database
    ├── Users
    ├── Policies
    ├── Claims
    ├── Settlements
    ├── Payments and Purchases
    ├── Reviews
    └── Notifications
```

This is a logical overview of the application's functional layers. Actual entities, database tables, and relationships depend on the implemented backend.

---

## 📁 Project Structure

### Frontend

The frontend contains the following major areas:

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

screenshots/
README.md
```

The actual repository may contain additional pages, components, stylesheets, and configuration files.

### Backend

The Spring Boot backend is organized around application responsibilities, including:

- Controllers and REST endpoints.
- Services and business logic.
- Repositories or data-access objects.
- Entities and DTOs.
- Security configuration.
- Authentication and JWT components.
- Application properties and integrations.

---

## ⚙️ Prerequisites

Install the following software to run the application locally:

| Software | Purpose |
|---|---|
| Java JDK 17 | Run the backend |
| Maven | Build and run the backend |
| MySQL 8 | Store application data |
| Node.js and npm | Install and run the frontend |
| Git | Clone and manage the repository |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
```

Replace the placeholders with your actual repository URL and directory name.

### 2. Configure MySQL

Create the database:

```sql
CREATE DATABASE `htc-insurance`;
```

Configure the backend database connection in `application.properties` or through environment variables.

Example configuration:

```properties
spring.application.name=insurance-management

spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/htc-insurance}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

spring.jpa.hibernate.ddl-auto=update
```

Set `DB_USERNAME` and `DB_PASSWORD` in your local environment before starting the backend.

The `update` setting is suitable for some development setups. For production, use a controlled database migration process and an appropriate schema-management strategy.

### 3. Run the Backend

Navigate to the directory containing the backend `pom.xml` file.

Using Maven:

```bash
mvn spring-boot:run
```

On Windows, if the Maven Wrapper is included:

```bat
mvnw.cmd spring-boot:run
```

The local backend is expected to run at:

[http://localhost:8080](http://localhost:8080)

If Swagger/OpenAPI is enabled, the documentation may be available at:

[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

The exact Swagger URL depends on the backend configuration.

### 4. Configure the Frontend

Navigate to the frontend directory containing `package.json`.

Create a `.env` file in that directory:

```env
VITE_API_URL=http://localhost:8080
```

The frontend API client uses this value as the backend base URL.

For a deployed frontend, configure `VITE_API_URL` to the deployed backend's base URL and rebuild the frontend after changing the variable.

**Important:** Vite variables prefixed with `VITE_` are exposed to the browser. Never place database passwords, JWT signing secrets, payment secrets, or private provider credentials in them.

### 5. Install Frontend Dependencies

```bash
npm install
```

### 6. Start the Frontend

```bash
npm run dev
```

Open the local address printed by Vite, typically:

[http://localhost:5173](http://localhost:5173)

The frontend should be able to reach the backend, and the backend must permit the frontend origin through its CORS configuration.

---

## ☁️ Deployment on Render

The application uses separate frontend and backend deployment URLs.

### Frontend Deployment

1. Connect the frontend project or directory to a Render Static Site.
2. Configure the build command:

   ```bash
   npm install && npm run build
   ```

3. Set the publish directory to `dist`.
4. Configure `VITE_API_URL` to point to the deployed backend.
5. Configure a single-page application rewrite so direct React Router URLs return `index.html`.

For example, a Render rewrite rule can use:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

### Backend Deployment

1. Deploy the Spring Boot application as a Render web service.
2. Configure the database connection and required environment variables.
3. Configure the production CORS allowed origin.
4. Configure JWT signing and validation settings securely.
5. Configure payment and OTP provider credentials as required.
6. Confirm that the backend can connect to its database.
7. Verify the deployed endpoints and application logs.

### Deployment URLs

**Frontend:**  
https://insurance-management-frontend-jsp3.onrender.com

**Backend:**  
https://insurance-management-ke8b.onrender.com

**Swagger UI:**  
https://insurance-management-ke8b.onrender.com/swagger-ui/index.html

These URLs are provided for the current deployment configuration; confirm service availability before sharing them publicly.

---

## 🔌 API Overview

The frontend API client defines calls for the following functional areas.

| Module | Example endpoints |
|---|---|
| Authentication | `/api/auth/login`, `/api/session` |
| Users | `/user/save`, `/user/getAll` |
| Plans | `/api/plans/available` |
| Policies | `/policy/available`, `/policy/my-policies` |
| Purchases | `/policy/purchase`, `/policy/my-purchases` |
| Payments | `/payment/create-order`, `/payment/verify` |
| Policy holders | `/policyholder/getAll` |
| Claims | `/claims/save`, `/claims/my-claims` |
| Settlements | `/settlement/save`, `/settlement/getAll` |
| Reviews | `/reviewer/save`, `/reviewer/my-reviews` |
| Notifications | `/api/notifications/my` |
| Admin broadcasts | `/api/admin/notifications` |

These are example paths configured in the frontend. Confirm actual backend mappings, request formats, HTTP methods, and access restrictions against the deployed backend.

---

## 🔐 Configuration and Security

Never commit production secrets to GitHub.

Use environment variables or a secure secret manager for:

- Database credentials.
- JWT signing secrets.
- Razorpay keys and secrets.
- OTP provider credentials.
- Third-party API keys.

Keep secret `.env` files out of version control. Provide a sanitized `.env.example` file when documenting required configuration.

### Production Security Checklist

- Enforce authorization and resource ownership in the backend.
- Hash passwords using a secure password-hashing algorithm.
- Validate JWT signatures, expiry, and authorization claims.
- Verify payment signatures on the backend.
- Prevent duplicate payment and settlement processing.
- Validate incoming data and uploaded files.
- Use HTTPS and appropriately restricted CORS.
- Protect personal, bank, and identity information.
- Avoid logging passwords, OTPs, tokens, or sensitive payment data.
- Maintain database backups and operational monitoring.

Browser `sessionStorage` is scoped to a tab session under normal browser behavior, but it is not a server-side session revocation mechanism. Production authentication should be designed around the application's threat model.

---

## 🧪 Testing Checklist

Before releasing a new version, verify the following:

- [ ] Customer registration and login.
- [ ] Administrator authentication and authorization.
- [ ] Session restoration after page refresh.
- [ ] Logout and access restrictions after logout.
- [ ] Customer data isolation and resource ownership.
- [ ] Insurance plan browsing and purchases.
- [ ] Payment verification on the backend.
- [ ] Claim submission and review.
- [ ] Settlement processing and status updates.
- [ ] Notification delivery and read/unread state.
- [ ] Reviews and administrator responses.
- [ ] Responsive behavior on mobile and desktop.
- [ ] Direct-route navigation and page refresh on Render.
- [ ] CORS configuration and API error handling.
- [ ] Database connectivity and backup procedures.

---

## 🔮 Future Enhancements

Potential future improvements include:

- Automated policy-renewal reminders.
- Downloadable policy certificates and payment receipts.
- Secure claim-document uploads.
- Claim and settlement status timelines.
- Administrative audit logs.
- Advanced reports and CSV exports.
- Email and SMS notifications.
- Automated integration and end-to-end tests.
- Continuous integration and deployment.
- Database backups and monitoring.
- More comprehensive payment reconciliation.

These are proposed enhancements and should not be considered implemented unless they are present in the application.

---

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork or clone the repository.
2. Create a branch for your change.
3. Implement and test the feature.
4. Check for security implications, particularly around customer data, authentication, and payments.
5. Submit a pull request with a clear description.

---

## 📄 License

No license has been specified yet. Add a `LICENSE` file and update this section before distributing the project publicly.

---

## 👨‍💻 Project Summary

**InsureX — Insurance Management System**

A full-stack web application designed to streamline insurance operations through customer self-service, policy management, payment integration, claims processing, settlement management, and administrative tools.

**Live Demo:** [InsureX](https://insurance-management-frontend-jsp3.onrender.com)

**Backend:** [InsureX API](https://insurance-management-ke8b.onrender.com)

**Built with:** React · Spring Boot · Java 17 · MySQL · Render

*InsureX — Simplifying Insurance Management.*
