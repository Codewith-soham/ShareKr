# ShareKar — API Specification

**Document:** 06 — API Specification  
**Project:** ShareKar  
**Version:** V1 — Local MVP  
**Status:** Draft for review  
**API style:** REST  
**Base path:** `/api/v1`  
**Backend:** Node.js, Express.js, TypeScript  
**Database:** PostgreSQL with Prisma ORM

---

## 1. Purpose

This document defines the API contract for ShareKar's V1 application. It specifies endpoint responsibilities, request and response formats, authentication, authorization, validation, error handling, pagination, and API security.

The API will support the React frontend, administrative dashboard, and background processes.

The API must enforce all business rules on the backend. Frontend validation is for usability only and must never replace backend validation.

## 2. API conventions

### 2.1 Base URL

Local development:

`http://localhost:<API_PORT>/api/v1`

Production:

`https://<API_DOMAIN>/api/v1`

The actual production domain will be selected during deployment.

### 2.2 HTTP methods

| Method | Purpose |
|---|---|
| GET | Retrieve resources |
| POST | Create resources or execute actions |
| PATCH | Partially update resources |
| PUT | Replace a resource where appropriate |
| DELETE | Remove or deactivate a resource |

### 2.3 Naming conventions

- Resource names use plural nouns.
- URLs use lowercase kebab-case where multiple words are needed.
- JSON request and response fields use `camelCase`.
- Resource IDs use UUIDs.
- Dates and timestamps use ISO 8601.
- API responses use JSON.
- All timestamps are stored in UTC and displayed in `Asia/Kolkata` for the initial Mumbai launch.

### 2.4 Successful response format

All successful responses use a consistent envelope:

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "id": "resource-uuid"
  }
}
```

For collection responses:

```json
{
  "success": true,
  "message": "Resources retrieved successfully",
  "data": {
    "items": [],
    "pagination": {
      "nextCursor": null,
      "hasMore": false
    }
  }
}
```

The `data` object contains the endpoint-specific response.

### 2.5 Error response format

All API errors use a consistent structure:

```json
{
  "success": false,
  "message": "The pool is already full",
  "errorCode": "POOL_FULL",
  "details": null
}
```

`details` may contain field-level validation errors or other safe diagnostic information. Internal stack traces, secrets, database details, and sensitive information must never be returned to clients.

## 3. HTTP status codes

| Status | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created |
| 204 | Successful request with no response body |
| 400 | Invalid request |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Business-rule or state conflict |
| 422 | Validation or semantic error |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |
| 503 | Service temporarily unavailable |

The API must use meaningful application error codes in addition to HTTP status codes.

## 4. Authentication and authorization

### 4.1 Initial authentication approach

The initial zero-cost pilot will use **email OTP authentication**.

Google login is deferred until a later release. Phone OTP remains the intended longer-term authentication method.

**Important product-policy alignment:** The approved PRD requires phone verification before users can access the main application. Email OTP does not satisfy that requirement. This specification treats email OTP as a temporary pilot deviation, not as equivalent phone verification. The PRD and Business Rules should be explicitly updated or the pilot should retain phone verification before implementation.

### 4.2 Authentication endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Start account registration |
| POST | `/auth/otp/send` | Send email OTP |
| POST | `/auth/otp/verify` | Verify OTP |
| POST | `/auth/login` | Start login using registered email |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke current refresh session |
| POST | `/auth/logout-all` | Revoke all sessions |
| GET | `/auth/me` | Retrieve authenticated user summary |

Registration and login must not grant full application access until the required OTP verification and mandatory profile completion steps are satisfied.

### 4.3 OTP rules

- OTP validity: 5 minutes.
- Maximum incorrect attempts: 3 per OTP challenge.
- OTP must be single-use.
- A newly issued OTP invalidates the previous active challenge.
- OTPs must be securely generated and stored as hashes.
- Resend requests must be rate-limited.
- Expired or exhausted challenges must be rejected.
- OTP values must never be logged.

The email delivery provider will be selected during implementation.

### 4.4 Token handling

The API uses:

- Short-lived access tokens.
- Refresh tokens delivered through secure, HttpOnly cookies.
- Refresh-token rotation.
- Refresh-token revocation on logout.
- Session invalidation when an account is suspended or deactivated.

The refresh cookie must use appropriate `Secure`, `HttpOnly`, and `SameSite` settings. CSRF protection must be applied to cookie-authenticated state-changing requests. CORS must allow only configured frontend origins.

The access token is sent through:

`Authorization: Bearer <access_token>`

The frontend must not store refresh tokens in local storage.

### 4.5 Authorization rules

- Public access is limited to the authentication flow and health-check endpoint.
- Authenticated users must have an active account.
- Users must complete mandatory profile requirements before using core features.
- Admin endpoints require an authorized admin role.
- Women-only pool access is enforced by the backend using the V1 eligibility rule.
- Suspended or deactivated accounts cannot access protected endpoints.
- Every resource operation must verify ownership or the relevant permission.

## 5. User and profile APIs

Base path: `/users`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/users/me` | Get current user's profile |
| PATCH | `/users/me` | Update editable profile fields |
| GET | `/users/me/settings` | Retrieve account settings |
| PATCH | `/users/me/settings` | Update supported settings |
| POST | `/users/me/email/change` | Start email change verification |
| POST | `/users/me/email/verify` | Verify new email |
| POST | `/users/me/profile-image/upload-signature` | Request signed image upload details |
| DELETE | `/users/me` | Start account deactivation and deletion workflow |

Profile fields include:

- Full name
- Email
- Gender
- Profile image URL
- Account status
- Verification status

Phone number changes, when phone authentication is introduced, must require verification of the new phone number.

### 5.1 Profile image upload

The frontend requests signed upload details from the backend, uploads the image directly to Cloudinary, and then submits the resulting image reference through the profile update endpoint.

The backend must generate signed upload parameters and validate the resulting asset reference.

The API must enforce allowed image formats and size limits. Exact limits will be set during implementation.

### 5.2 Account deletion

Account deletion follows the approved two-stage process:

1. Immediately deactivate the account and invalidate active sessions.
2. Apply the approved pool cancellation and membership rules.
3. Schedule deletion or anonymization of eligible personal data after the configured retention period.
4. Retain records where required for legal, security, or audit purposes.

The retention period is not yet defined and must be configured before production.

## 6. Destination APIs

Base path: `/destinations`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/destinations` | List active destinations |
| GET | `/destinations/:destinationId` | Retrieve destination details |
| POST | `/destination-requests` | Submit a missing-destination request |
| GET | `/destination-requests/me` | List current user's requests |

Users can select only active destinations from the admin-managed directory.

Users cannot directly create destinations.

Destination requests are reviewed by an administrator.

## 7. Pool APIs

Base path: `/pools`

### 7.1 Pool discovery

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/pools` | Search and discover pools |
| GET | `/pools/:poolId` | Retrieve pool details |
| GET | `/pools/me/created` | List pools created by current user |
| GET | `/pools/me/joined` | List pools joined by current user |
| GET | `/pools/me/history` | Retrieve pool participation history |

The discovery endpoint supports query parameters such as:

| Parameter | Purpose |
|---|---|
| `destinationId` | Filter by destination |
| `date` | Filter by departure date |
| `departureFrom` | Earliest departure time |
| `departureTo` | Latest departure time |
| `latitude` | Search origin latitude |
| `longitude` | Search origin longitude |
| `radiusKm` | Pickup search radius |
| `journeyType` | Immediate or scheduled |
| `visibility` | General or women-only |
| `status` | Pool status |
| `cursor` | Cursor for pagination |
| `limit` | Maximum results per page |

Default pickup search radius: 1 km.

Default departure-time matching window: 15 minutes.

Pickup distance is calculated using straight-line geographic distance.

The backend must apply visibility, eligibility, blocking, membership, and geographic rules before returning joinable results.

Full and closed pools may be displayed with their status, but joining must be disabled.

### 7.2 Create a pool

`POST /pools`

Example request:

```json
{
  "destinationId": "destination-uuid",
  "journeyType": "IMMEDIATE",
  "pickup": {
    "address": "Selected pickup address",
    "latitude": 19.25,
    "longitude": 72.86
  },
  "departureTime": null,
  "joinDeadline": "2026-11-01T10:05:00.000Z",
  "capacity": 3,
  "visibility": "GENERAL"
}
```

For scheduled pools, `journeyType` is `SCHEDULED` and `departureTime` must contain the selected future departure time.

The backend must:

1. Authenticate the user.
2. Verify account status and profile completeness.
3. Verify that the user has no other active pool participation.
4. Validate the destination and pickup coordinates.
5. Validate capacity and timing.
6. Verify visibility eligibility.
7. Create the pool and creator membership atomically.
8. Record the creation event.
9. Return the created pool.

Capacity includes the creator and can be 1, 2, or 3.

A capacity-1 pool becomes ready immediately after creation.

### 7.3 Update pool details

| Method | Endpoint | Purpose |
|---|---|---|
| PATCH | `/pools/:poolId` | Update permitted pool details |
| PATCH | `/pools/:poolId/pickup` | Edit pickup before it is locked |
| PATCH | `/pools/:poolId/departure` | Edit departure time before it is locked |
| PATCH | `/pools/:poolId/deadline` | Extend joining deadline |

The backend must enforce creator ownership and the pool's current status.

Pickup and departure time become locked after the first additional passenger joins.

The creator may extend the joining deadline while the pool is open. The new deadline must be in the future. The deadline cannot be shortened.

Capacity and visibility cannot be changed after another passenger joins.

### 7.4 Pool membership

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/pools/:poolId/join` | Join a pool |
| POST | `/pools/:poolId/leave` | Leave an open pool |
| GET | `/pools/:poolId/members` | Retrieve member details when authorized |

Joining is automatic after confirmation. Creator approval is not required.

The join operation must perform all checks again on the backend, even if the frontend previously displayed an eligibility result.

Checks include:

- Pool exists and is open.
- Joining deadline has not passed.
- Available capacity remains.
- User account is active and profile is complete.
- User is not already an active member.
- User has no other active pool participation.
- User is eligible for the pool's visibility.
- No applicable block relationship prevents participation.

**Concurrency requirement:** Seat availability checks and membership creation must happen atomically within a database transaction. Concurrent join requests must never exceed capacity.

When a user leaves an open pool, the membership record is retained with `LEFT` status. Rejoining is allowed if the pool is still open, the deadline has not passed, and all eligibility rules remain satisfied.

Members cannot voluntarily leave a ready pool under the approved V1 rules.

### 7.5 Pool lifecycle actions

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/pools/:poolId/ready` | Creator ends waiting early |
| POST | `/pools/:poolId/cancel` | Creator cancels pool |

The creator can mark a pool ready early only when the minimum participation requirement is met.

The creator can cancel a pool after confirmation, including when it is ready. A cancellation reason may be provided.

At the joining deadline:

- If at least one active member remains, the pool becomes ready.
- If no active members remain, the pool expires.
- If scheduled departure arrives before the joining deadline, joining stops and the same participation rule is evaluated.

Ready pools automatically close after 30 minutes.

The proposed database representation is `EXPIRED` with an expiration reason of `READY_TIMEOUT`. This follows the current approved database baseline.

All lifecycle changes must be recorded in the pool event history.

## 8. Invitation APIs

Base path: `/pools/:poolId/invitations`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/pools/:poolId/invitations` | Generate an invitation link |
| GET | `/invitations/:token` | Validate and retrieve invitation context |

Invitation links:

- Do not reserve a seat.
- Do not bypass registration or authentication.
- Do not bypass gender or other eligibility rules.
- Do not bypass capacity or deadline checks.
- Must use an unguessable token.
- Must be validated again when the invited user joins.

Logged-out users must complete authentication and then return to the invitation flow.

Token expiration, revocation, and storage details remain implementation decisions and must be finalized before invitation functionality is released.

## 9. Notification APIs

Base path: `/notifications`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/notifications` | List current user's notifications |
| PATCH | `/notifications/:notificationId/read` | Mark one notification as read |
| POST | `/notifications/read-all` | Mark all notifications as read |
| POST | `/notifications/push-subscriptions` | Register a push subscription |
| DELETE | `/notifications/push-subscriptions/:subscriptionId` | Remove a push subscription |

Notifications must be persisted in the database.

Supported notification events include:

- Member joins or leaves.
- Pool becomes ready.
- Pool expires.
- Pool is cancelled.
- Scheduled departure reminders at 10 and 5 minutes before departure.

Notifications must be sent only to the relevant pool participants.

Push notifications use Firebase Cloud Messaging where supported and permission is granted. In-app notifications remain available independently of push permission.

The backend scheduler must cancel or suppress reminders when a user leaves or a pool is cancelled.

## 10. Safety APIs

### 10.1 Reporting

Base path: `/reports`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/reports/users` | Report a user |
| POST | `/reports/pools` | Report a pool |
| GET | `/reports/me` | View reports submitted by current user |

Reporting does not automatically remove users or cancel pools. Reports are reviewed by administrators.

### 10.2 Blocking

Base path: `/blocks`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/blocks/:userId` | Block a user |
| DELETE | `/blocks/:userId` | Unblock a user |
| GET | `/blocks` | List blocked users |

Blocking must be enforced by the backend for discovery, joining, and applicable pool interactions.

If two users are already in the same active pool when a block is created, the existing pool remains unchanged under the approved rule.

## 11. Feedback APIs

Base path: `/feedback`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/feedback` | Submit feedback |
| GET | `/feedback/me` | Retrieve current user's submitted feedback |

Feedback categories may include suggestions, technical problems, and general experience.

V1 does not include star ratings.

## 12. Admin APIs

Base path: `/admin`

All admin endpoints require authentication and an authorized admin role.

### 12.1 User management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/users` | List and search users |
| GET | `/admin/users/:userId` | View user details |
| POST | `/admin/users/:userId/suspend` | Suspend a user |
| POST | `/admin/users/:userId/reinstate` | Reinstate a user |

Suspension must invalidate active sessions immediately. The backend must apply the approved pool cancellation and membership rules.

### 12.2 Pool management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/pools` | List and filter pools |
| GET | `/admin/pools/:poolId` | View pool details |
| POST | `/admin/pools/:poolId/remove-member` | Remove a member when authorized |

Administrative removal must be recorded with an audit event and reason, and affected users must be notified.

### 12.3 Destination management

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/admin/destinations` | Create destination |
| PATCH | `/admin/destinations/:destinationId` | Update destination |
| POST | `/admin/destinations/:destinationId/activate` | Activate destination |
| POST | `/admin/destinations/:destinationId/deactivate` | Deactivate destination |
| GET | `/admin/destination-requests` | List destination requests |
| PATCH | `/admin/destination-requests/:requestId` | Review a destination request |

### 12.4 Report and feedback management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/reports` | List reports |
| PATCH | `/admin/reports/:reportId` | Update report review status |
| GET | `/admin/feedback` | List submitted feedback |
| PATCH | `/admin/feedback/:feedbackId` | Update feedback review status |

All admin actions must be authorized and recorded for audit purposes.

## 13. Health-check APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Basic application health |
| GET | `/health/ready` | Check whether required dependencies are ready |

The readiness endpoint should check required dependencies such as database connectivity.

Health endpoints must not expose credentials, environment variables, internal infrastructure details, or sensitive configuration.

## 14. Validation rules

Request validation must happen before business logic executes.

Recommended validation library: **Zod**.

Validation must cover:

- UUID format and resource existence.
- Required fields and field types.
- Email format.
- OTP format and expiration.
- Latitude and longitude ranges.
- Capacity restricted to 1–3.
- Valid pool status and visibility values.
- Future departure and deadline constraints.
- Supported destination IDs.
- Allowed profile image formats and upload limits.
- Pagination limits and cursor validity.
- Request body size.

Validation schemas should be reusable where appropriate and shared between related API modules only when doing so does not couple frontend and backend implementation unnecessarily.

## 15. Rate limiting and abuse prevention

Use general API rate limiting plus stricter limits for sensitive operations.

Stricter protection is required for:

- Registration and login.
- OTP send and verification.
- Pool creation.
- Pool joining.
- Invitation generation and validation.
- Reporting.

Rate limits should be based on suitable combinations of IP address, account, and operation.

The initial implementation may use in-process rate limiting, but this is not reliable across multiple backend instances or restarts. A shared rate-limit store may be required if the application scales.

Rate-limit responses must use HTTP `429` and the standard error format.

## 16. Pagination and search

Use cursor-based pagination for large or frequently changing result sets.

Supported parameters:

- `cursor`
- `limit`

The API must enforce a maximum page size.

Cursor values should be opaque to clients. Ordering must be deterministic, using a stable sort field and unique tie-breaker.

Search results should not expose private profile or membership information to users who have not joined the relevant pool.

## 17. Security requirements

The API must implement:

1. HTTPS in deployed environments.
2. Authentication middleware for protected routes.
3. Role-based authorization for admin routes.
4. Resource ownership and membership checks.
5. Backend enforcement of all business rules.
6. Secure passwordless OTP handling.
7. Refresh-token rotation and revocation.
8. CSRF protection for cookie-authenticated state-changing requests.
9. Strict CORS origin allowlisting.
10. Request validation and safe error handling.
11. Rate limiting for sensitive endpoints.
12. Secure image-upload signatures.
13. Protection against SQL injection through Prisma's parameterized queries.
14. Audit events for important pool and admin actions.
15. No sensitive information in application logs.

The API must not expose driver booking, driver management, fare calculation, fare splitting, payment, or chat functionality in V1.

## 18. API implementation structure

The backend will follow the approved modular monolith and feature-based architecture.

Suggested structure:

```text
apps/api/src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── destinations/
│   ├── destination-requests/
│   ├── pools/
│   ├── invitations/
│   ├── notifications/
│   ├── reports/
│   ├── blocks/
│   ├── feedback/
│   ├── admin/
│   └── health/
├── middleware/
├── config/
├── jobs/
├── lib/
├── routes/
├── app.ts
└── server.ts
```

Each feature module may contain:

- Routes
- Controllers
- Services
- Repositories
- Validation schemas
- Types

Controllers handle HTTP concerns. Services implement business rules. Repositories handle database access through Prisma.

Database transactions should be used for operations that must remain consistent, especially pool creation, joining, leaving, cancellation, and lifecycle transitions.

## 19. API documentation and testing

Maintain both:

1. An OpenAPI specification as the machine-readable API contract.
2. Markdown developer documentation for implementation notes, business-rule explanations, and setup instructions.

Recommended tooling:

- OpenAPI 3.x.
- Swagger UI for browsing the API contract.
- Postman or an equivalent HTTP client for manual testing.
- Automated integration tests for API behavior.

Tests must cover:

- Authentication and OTP expiration.
- Authorization and account suspension.
- Profile validation.
- Destination selection.
- Pool creation and lifecycle transitions.
- Concurrent join requests and capacity enforcement.
- One-active-pool-per-user enforcement.
- Women-only eligibility.
- Blocking and reporting.
- Invitations and token validation.
- Notification authorization.
- Admin permissions.
- Rate limits and invalid requests.

## 20. Background processing and API consistency

The backend's in-process scheduler handles pool deadlines, ready-pool closure, and scheduled notifications.

The API must not rely on the frontend to trigger lifecycle changes.

Background jobs must be idempotent and safe to retry. Startup reconciliation and periodic checks must handle missed work caused by backend restarts or free-tier hosting sleep.

The API must return the current persisted pool status, not infer status solely from client-side timers.

## 21. V1 exclusions

The following endpoints and capabilities are explicitly excluded:

- Driver registration or driver accounts.
- Driver discovery, hiring, or booking.
- Driver integrations.
- Fare estimates or fare calculations.
- Fare splitting.
- Payments and wallet operations.
- Passenger-to-passenger chat.
- Live GPS tracking.
- SOS functionality.
- User-created arbitrary destinations.
- Google login in the initial email-OTP pilot.

These must not be introduced into the V1 API without a separate product decision.

## 22. Decisions still required before implementation

The API structure is defined, but the following details need final decisions or configuration:

1. **Authentication policy alignment:** Whether the pilot will temporarily accept email verification instead of the PRD's mandatory phone verification, and whether the PRD and Business Rules will be updated.
2. **OTP delivery provider:** Select an email provider compatible with the no-card/no-paid-subscription policy.
3. **Access-token lifetime:** Choose the exact duration.
4. **Refresh-token lifetime:** Choose the exact duration and session policy.
5. **Cookie and CSRF configuration:** Finalize based on frontend and backend production domains.
6. **Invitation security:** Define token expiry, revocation, and storage.
7. **Ready-pool closure:** Confirm the `EXPIRED` plus `READY_TIMEOUT` representation in the Business Rules implementation baseline.
8. **Account retention:** Define the data retention period.
9. **Image constraints:** Define maximum upload size and accepted formats.
10. **Rate-limit thresholds:** Set exact limits and windows.
11. **Cursor sort order:** Finalize stable ordering for each collection endpoint.
12. **Admin permissions:** Define which admin roles can perform each moderation action.

These decisions should be finalized before the affected endpoints are implemented.

## 23. Approval

This document is a proposed V1 API contract. Approval confirms the endpoint structure and API design baseline; it does not mean unresolved implementation settings have already been decided.

**Status:** Draft — approved