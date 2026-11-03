# 05 — System Architecture

**Project:** ShareKar  
**Document:** System Architecture  
**Version:** 1.0  
**Status:** Draft for Review  
**Architecture principle:** Zero-cost-first, modular monolith

---

## 1. Architecture Overview

ShareKar will use a client-server architecture with a React frontend, a Node.js/Express backend, and a PostgreSQL database.

The initial system will be designed as a modular monolith. Business logic will remain in one backend codebase, organized into independent feature modules.

The architecture must support:

- Local development through Docker Compose.
- Public deployment using eligible free-tier services.
- Secure authentication and authorization.
- Transaction-safe pool creation and joining.
- Scheduled pool lifecycle operations.
- Future migration to paid infrastructure without rewriting core business logic.

**Primary constraint:** The initial development and deployment process must not require payment or payment-card registration. Any service that requires a card, paid subscription, or paid upgrade will need to be replaced or deferred.

Free-tier availability, usage limits, and provider terms must be checked before deployment. Free services may sleep, pause, throttle requests, or change their policies.

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + TypeScript |
| Frontend build tool | Vite |
| Styling | Tailwind CSS |
| Backend | Node.js + Express.js + TypeScript |
| API architecture | REST |
| API versioning | `/api/v1` |
| Database | PostgreSQL |
| Database hosting | Neon PostgreSQL |
| ORM | Prisma |
| Profile image storage | Cloudinary, subject to free-tier eligibility |
| Frontend hosting | Free static hosting, provider subject to terms |
| Backend hosting | Free application hosting, provider subject to terms |
| Local environment | Docker + Docker Compose |
| Version control | Git + GitHub |
| Push notifications | Firebase Cloud Messaging |
| Authentication for initial pilot | Email OTP |
| Future authentication | Phone OTP + optional Google sign-in |

## 3. High-Level System Architecture

The system will contain the following logical components:

1. React frontend application.
2. Express REST API.
3. Feature-based backend modules.
4. PostgreSQL database hosted on Neon.
5. Cloudinary image storage.
6. In-process background job scheduler.
7. Firebase Cloud Messaging integration.
8. External email delivery provider, to be selected after free-tier verification.

### Request flow

1. A user interacts with the React application.
2. The frontend sends an HTTPS request to the Express API.
3. Authentication middleware validates the user's session or access token.
4. Authorization middleware checks permissions and account status.
5. The relevant feature module executes its business logic.
6. Prisma communicates with PostgreSQL.
7. The API returns a structured response.
8. The frontend updates the interface.

The frontend must not independently enforce critical business rules. All eligibility, capacity, membership, visibility, and pool lifecycle checks must be performed by the backend.

## 4. Repository Structure

ShareKar will use a monorepo.

Proposed structure:

    sharekar/
    ├── apps/
    │   ├── web/
    │   │   ├── src/
    │   │   ├── public/
    │   │   ├── package.json
    │   │   └── vite.config.ts
    │   │
    │   └── api/
    │       ├── src/
    │       ├── prisma/
    │       ├── tests/
    │       └── package.json
    │
    ├── packages/
    │   └── shared/
    │
    ├── docs/
    ├── docker-compose.yml
    ├── .gitignore
    ├── package.json
    ├── README.md
    └── .env.example

The shared package may contain common TypeScript types and validation contracts. It must not contain secrets or server-only business logic.

## 5. Frontend Architecture

The frontend will be a React single-page application built using Vite and TypeScript.

Responsibilities:

- Authentication and registration interfaces.
- User profile management.
- Pool discovery and filtering.
- Pool creation and joining.
- Pool membership management.
- Notifications and pool history.
- Feedback and reporting.
- Admin dashboard interfaces.

Frontend organization will be feature-oriented.

Proposed structure:

    apps/web/src/
    ├── app/
    ├── components/
    ├── features/
    │   ├── auth/
    │   ├── users/
    │   ├── destinations/
    │   ├── pools/
    │   ├── notifications/
    │   ├── reports/
    │   ├── feedback/
    │   └── admin/
    ├── hooks/
    ├── lib/
    ├── services/
    ├── types/
    └── styles/

API communication will be centralized in service modules rather than scattered throughout UI components.

The frontend will not connect directly to PostgreSQL.

## 6. Backend Architecture

The backend will use Express.js with TypeScript and follow a feature-based modular structure.

Each feature module may contain:

- Routes
- Controllers
- Services
- Repositories, where needed
- Validation schemas
- Types

Proposed structure:

    apps/api/src/
    ├── config/
    ├── common/
    │   ├── middleware/
    │   ├── errors/
    │   ├── utils/
    │   └── validators/
    ├── modules/
    │   ├── auth/
    │   ├── users/
    │   ├── destinations/
    │   ├── pools/
    │   ├── memberships/
    │   ├── notifications/
    │   ├── reports/
    │   ├── blocks/
    │   ├── feedback/
    │   └── admin/
    ├── jobs/
    ├── integrations/
    ├── app.ts
    └── server.ts

### Backend responsibilities

The backend is the source of truth for:

- Authentication and account status.
- User eligibility.
- Pool creation and lifecycle.
- Capacity and concurrent joining.
- Membership restrictions.
- Women-only pool access.
- Blocking and reporting rules.
- Destination management.
- Notification generation.
- Admin permissions.

Controllers will handle HTTP requests and responses. Services will implement business rules. Database access will use Prisma.

## 7. Database Architecture

ShareKar will use PostgreSQL with Prisma ORM.

**Development database:** PostgreSQL running locally through Docker Compose.

**Initial public database:** Neon PostgreSQL free tier, subject to current provider limits and terms.

The database will remain relational because the application relies on relationships and transactional consistency.

The approved database design contains twelve tables:

1. users
2. destinations
3. pools
4. pool_members
5. pool_reports
6. user_blocks
7. notifications
8. pool_events
9. destination_requests
10. feedback
11. admin_roles
12. push_subscriptions

Prisma migrations will manage schema changes.

### Database consistency requirements

- Enforce one active pool membership per user.
- Enforce one active membership per user per pool.
- Validate pool capacity during joining.
- Use database transactions for concurrent join operations.
- Prevent unauthorized pool membership changes.
- Store pool lifecycle events for audit history.
- Use appropriate indexes for discovery and membership queries.

The database must not depend on in-memory API state.

## 8. Authentication and Session Architecture

The initial zero-cost pilot will use email OTP authentication.

The original phone OTP requirement will be deferred until a suitable SMS provider and funding are available.

Google sign-in may be added as an optional authentication method after the initial authentication flow is stable. Google sign-in does not replace the requirement for verified contact information.

### Authentication flow

1. User enters their email address.
2. Backend requests an OTP.
3. OTP is delivered through the selected email provider.
4. User submits the OTP.
5. Backend validates the OTP and expiry.
6. Backend creates or authenticates the account.
7. Backend issues authentication credentials.

OTP values must be stored securely, expire after a limited period, and be protected by rate limits and attempt limits.

### Token strategy

Use:

- Short-lived access tokens.
- Refresh tokens stored in secure, HttpOnly cookies.
- Refresh-token rotation and revocation.
- Token version checks for account suspension and invalidation.

Cookie settings must account for the separate frontend and backend origins. CORS must allow only approved origins and credentials.

## 9. Image Storage

Cloudinary will be used for profile image storage if its free plan meets the no-card and usage requirements.

### Upload flow

1. Frontend requests an upload authorization from the backend.
2. Backend generates a signed upload authorization.
3. Frontend uploads the image directly to Cloudinary.
4. Cloudinary returns the uploaded image reference.
5. Frontend sends the reference to the backend.
6. Backend validates and stores the reference in the user's profile.

The backend must control upload authorization and validate file type, size, and ownership.

If Cloudinary cannot meet the zero-cost requirement, image uploads will be deferred or another eligible provider will be selected.

## 10. Background Jobs and Pool Lifecycle

For the initial deployment, scheduled tasks will execute within the backend application process.

A separate worker service will not be deployed initially because it could introduce additional hosting requirements.

The job scheduler will handle:

- Immediate pool joining deadlines.
- Scheduled pool joining deadlines.
- Pool expiration.
- Ready-pool automatic closure after thirty minutes.
- Scheduled departure reminders.
- Notification generation.
- Cleanup of eligible expired temporary data.

Jobs must be designed to be idempotent. Re-running a job must not create duplicate notifications or incorrectly transition a pool.

Database timestamps will be stored in UTC and displayed using Asia/Kolkata time for the initial launch.

### Important reliability limitation

An in-process scheduler may stop when the backend sleeps, restarts, or is unavailable.

Therefore, the system must not rely only on a timer held in memory. On startup and during periodic execution, it must query PostgreSQL for due lifecycle operations and process them safely.

The database remains the source of truth for deadlines and pool states.

For production reliability, the scheduler can later be moved to a separate worker or managed job queue.

## 11. Notifications

The initial notification architecture will support:

- In-app notifications.
- Push notifications through Firebase Cloud Messaging, where supported.
- Email OTP delivery through a provider selected for the pilot.

Notification records will be stored in PostgreSQL.

The backend will create notifications when relevant business events occur.

Push delivery will be handled through a separate integration module so the provider can be replaced later.

Push notifications are best-effort. In-app notification records remain the durable source of notification history.

## 12. Real-Time Updates

The initial version will use API polling rather than WebSockets or Server-Sent Events.

The frontend will periodically request updated pool information while a user is viewing relevant pool screens.

Polling intervals should be conservative to avoid exhausting free-tier database and hosting resources.

A real-time communication mechanism may be introduced later if usage justifies it.

## 13. Deployment Architecture

The initial deployment must use services that can be used without entering payment-card details or activating paid subscriptions.

### Logical production setup

- Frontend: free static hosting.
- Backend: free application hosting.
- Database: Neon PostgreSQL.
- Images: Cloudinary free allowance, if eligible.
- Push: Firebase Cloud Messaging.
- Email: a provider with a suitable free allowance and no mandatory card.
- Source control: GitHub.

The exact frontend, backend, and email providers remain subject to verification against current free-tier policies.

### Environments

The project will maintain three logical environments:

1. Local development.
2. Staging/testing.
3. Production.

Staging may use local infrastructure or an eligible free preview deployment if separate hosted resources are not available without payment.

Production credentials and data must never be reused in local development.

## 14. Docker and Local Development

Docker Compose will be used to run the complete local development environment.

Expected services:

- Frontend application.
- Express backend.
- PostgreSQL.
- Background scheduler, initially running as part of the backend.

The local environment should support:

- Database initialization.
- Prisma migrations.
- Development scripts.
- Environment-variable configuration.
- API health checks.

Docker will be used for development consistency. Production deployment packaging will be adapted to the selected hosting provider.

## 15. Security Architecture

Security controls will include:

- HTTPS for public deployments.
- Secure passwordless authentication.
- OTP expiry and rate limiting.
- Secure refresh-token handling.
- CORS restrictions.
- Input validation.
- Authorization middleware.
- Account suspension enforcement.
- Database transaction checks.
- Protection against concurrent pool overbooking.
- Secure image upload authorization.
- Environment-based secret management.
- Admin-only authorization.
- Audit events for sensitive pool actions.

Sensitive values must never be committed to GitHub.

A `.env.example` file will document required configuration variables without exposing actual secrets.

## 16. Logging, Monitoring and Health Checks

The initial system will use free or built-in operational tools.

Required capabilities:

- Structured application logs.
- Centralized Express error handling.
- API health-check endpoint.
- Database connectivity check.
- Basic deployment and uptime monitoring.
- Error tracking, if a suitable no-card free service is available.

Health checks must not expose secrets or internal database credentials.

## 17. Backup and Recovery

Neon backup and recovery capabilities must be checked against the selected free plan before production data is stored.

Until a verified backup strategy is available:

- Maintain schema migrations in Git.
- Avoid destructive database changes.
- Export important test data where appropriate.
- Do not treat a free database as guaranteed permanent storage.
- Clearly communicate that free-tier infrastructure does not provide production-grade recovery guarantees.

Before expanding beyond a small pilot, establish a tested backup and restoration procedure.

## 18. Scalability and Future Evolution

The initial modular monolith is intended to minimize operational complexity.

Future improvements may include:

- A separate background worker.
- Managed job queues.
- Redis for caching or distributed coordination, if justified.
- WebSockets or Server-Sent Events.
- Paid database and application hosting.
- Stronger monitoring and alerting.
- More robust backup and recovery.
- Organization and tenant support for future B2B use cases.

The architecture should avoid unnecessary microservices, Kubernetes, and distributed infrastructure during V1.

## 19. Zero-Cost Deployment Policy

The following rules apply to initial development and deployment:

1. No paid subscriptions.
2. No payment-card registration.
3. No paid trials that automatically convert to subscriptions.
4. No services with automatic billing.
5. Free-tier limits must be monitored.
6. Paid features must remain disabled.
7. If a service cannot satisfy the zero-cost requirement, select an alternative or defer that feature.
8. Free-tier provider limitations must be documented.
9. Do not promise production-grade uptime or data durability from free infrastructure.

This policy applies to hosting, databases, email, SMS, image storage, monitoring, and other external integrations.

## 20. Known Trade-offs

The zero-cost-first strategy introduces several limitations:

- Free backend instances may sleep.
- Scheduled jobs may be delayed by sleeping or restarting processes.
- Free databases have storage and compute limits.
- Free image storage has usage restrictions.
- Email delivery may have daily or monthly quotas.
- Push delivery depends on device and browser support.
- Staging and production may not have fully isolated hosted resources.
- Free hosting terms may restrict certain commercial uses.

These limitations are acceptable for an early pilot only if users are informed appropriately and important data is protected.

## 21. Architecture Approval Checklist

Before this document is finalized, confirm:

- [ ] Technology stack and monorepo structure.
- [ ] Neon PostgreSQL and Prisma.
- [ ] Email OTP for the initial pilot.
- [ ] In-process background scheduler.
- [ ] API polling for pool updates.
- [ ] Free-tier-only deployment policy.
- [ ] No payment-card requirement.
- [ ] Cloudinary and FCM subject to free-tier verification.
- [ ] Deployment provider selection remains open.
- [ ] Backup and recovery plan remains subject to provider verification.

**Document status:** Draft for review. No implementation or deployment provider is considered finalized beyond the decisions explicitly approved by the project owner.