# ShareKar — Testing Strategy

**Document:** 08 — Testing Strategy  
**Project:** ShareKar  
**Version:** V1 — Local MVP  
**Status:** Draft for review  
**Frontend:** React + TypeScript + Vite  
**Backend:** Node.js + Express + TypeScript  
**Database:** PostgreSQL + Prisma  
**Testing framework:** Vitest  
**API testing:** Supertest  
**Frontend component testing:** React Testing Library  
**End-to-end testing:** Playwright  
**CI/CD:** GitHub Actions

---

## 1. Purpose

This document defines the testing strategy for ShareKar V1.

The purpose is to ensure that the application is reliable, secure, maintainable, and consistent with the approved product requirements and business rules.

Testing will cover:

- Frontend behavior.
- Backend business logic.
- REST API behavior.
- Database integrity.
- Authentication and authorization.
- Pool creation, discovery, joining, and lifecycle.
- Concurrency and capacity enforcement.
- Security and failure handling.
- Performance of critical APIs.
- Deployment readiness.

Automated testing will be the primary approach, supported by manual testing.

## 2. Testing principles

The following principles apply:

1. Prioritize critical business logic and security.
2. Test backend enforcement, not just frontend behavior.
3. Use automated tests wherever practical.
4. Use a real PostgreSQL database for integration tests.
5. Use mocks for isolated unit tests where appropriate.
6. Test normal, invalid, boundary, and failure scenarios.
7. Prevent regressions through automated checks.
8. Never use production user data as test data.
9. Test database migrations before deployment.
10. Do not merge untested changes into `main`.

Testing must follow the approved business rules and API specification.

## 3. Testing environments

Use three logical environments.

| Environment | Purpose |
|---|---|
| Local | Development and automated testing |
| Staging | Pre-release verification |
| Production | Smoke tests and post-deployment checks |

### 3.1 Local environment

The local environment will use Docker Compose.

It should include:

- React frontend.
- Express backend.
- PostgreSQL database.
- Required local supporting services where practical.

Automated tests must run without depending on production services.

### 3.2 Staging environment

Staging should be used to verify:

- Deployment configuration.
- Database migrations.
- Authentication integration.
- Image uploads.
- Email delivery.
- Push notification integration where configured.
- Important user flows.

Staging must use separate test data and must not affect production users.

### 3.3 Production environment

Production testing should be limited to safe smoke tests and operational checks.

Do not perform destructive tests, stress tests, or synthetic operations that could affect real users.

## 4. Testing tools

| Purpose | Tool |
|---|---|
| Unit testing | Vitest |
| Backend API integration | Vitest + Supertest |
| Frontend component testing | Vitest + React Testing Library |
| Database integration | PostgreSQL test database + Prisma |
| Manual API testing | Postman |
| End-to-end testing | Playwright |
| CI automation | GitHub Actions |
| Code quality | ESLint + Prettier + TypeScript |

Use compatible versions of these tools and keep test configuration maintained in the repository.

## 5. Unit testing

Unit tests verify individual functions, components, and service logic independently.

### 5.1 Backend unit tests

Priority areas include:

**Authentication**
- OTP generation and validation.
- OTP expiration.
- Incorrect-attempt limits.
- Token validation.
- Refresh-token rotation logic.
- Account eligibility checks.

**Pool management**
- Pool creation validation.
- Capacity validation.
- Deadline calculations.
- Departure-time validation.
- Pool status transitions.
- Early-ready eligibility.
- Cancellation rules.

**Membership**
- One active pool per user.
- Creator membership rules.
- Joining eligibility.
- Leaving and rejoining.
- Capacity calculations.
- Women-only pool eligibility.
- Blocked-user restrictions.

**Other modules**
- Destination validation.
- Invitation-token validation.
- Notification recipient selection.
- Reporting validation.
- Admin authorization.

### 5.2 Frontend unit and component tests

Use React Testing Library with Vitest.

Test important UI behavior such as:

- Form validation.
- Loading indicators.
- Error messages.
- Empty states.
- Button interactions.
- Conditional rendering.
- Pool status display.
- Disabled join actions.
- Profile form behavior.

Frontend tests must not replace backend business-rule tests.

## 6. Backend integration testing

Use Vitest and Supertest to test API endpoints against a real test PostgreSQL database.

Mocks may be used for external services such as email delivery, Cloudinary, and Firebase Cloud Messaging.

### 6.1 Authentication APIs

Test:

- Registration initiation.
- OTP delivery integration through a mocked provider.
- Successful OTP verification.
- Invalid OTP.
- Expired OTP.
- OTP reuse.
- Maximum incorrect attempts.
- Refresh-token rotation.
- Logout.
- Logout from all sessions.
- Suspended-account access denial.
- Deactivated-account access denial.

### 6.2 User APIs

Test:

- Retrieve profile.
- Update editable profile fields.
- Invalid profile data.
- Profile-image upload authorization.
- Email change verification.
- Account deactivation.
- Session invalidation after account deactivation.

### 6.3 Destination APIs

Test:

- List active destinations.
- Retrieve destination details.
- Reject inactive destinations for new pools.
- Submit destination requests.
- Admin destination creation and updates.
- Destination activation and deactivation.

### 6.4 Pool APIs

Test:

- Create immediate pool.
- Create scheduled pool.
- Retrieve pool details.
- Discover matching pools.
- Filter by destination.
- Filter by pickup radius.
- Filter by departure time.
- Filter by journey type.
- Filter by visibility.
- Retrieve created and joined pool history.
- Reject invalid pool creation.
- Reject duplicate active participation.

### 6.5 Membership APIs

Test:

- Successful joining.
- Joining a full pool.
- Joining after the deadline.
- Joining an expired or cancelled pool.
- Joining a women-only pool without eligibility.
- Joining while already participating in another active pool.
- Leaving an open pool.
- Rejoining when eligible.
- Preventing voluntary departure from a ready pool.
- Creator cancellation behavior.

### 6.6 Safety and administration APIs

Test:

- Report a user.
- Report a pool.
- Block a user.
- Unblock a user.
- Prevent blocked-user interactions where required.
- Admin user suspension.
- Admin user reinstatement.
- Admin report review.
- Admin member removal.
- Unauthorized admin access.

## 7. Database testing

Use a dedicated PostgreSQL test database.

Test the following:

### 7.1 Schema and migrations

- Prisma schema validity.
- Initial migration.
- Subsequent schema migrations.
- Migration application on an empty database.
- Migration application on a database containing test data.

### 7.2 Relationships and constraints

Verify:

- User-to-pool relationships.
- Pool-to-member relationships.
- Pool-to-destination relationships.
- Report relationships.
- User-block uniqueness.
- Notification relationships.
- Pool event history relationships.

### 7.3 Database invariants

Verify that database constraints enforce important rules, including:

- Unique identifiers.
- Valid capacity values.
- Valid coordinate ranges.
- One active membership per user per pool.
- One active pool participation per user.
- Valid foreign-key relationships.

### 7.4 Transaction testing

Test operations that require atomicity:

- Pool creation with creator membership.
- Pool joining.
- Pool leaving.
- Pool cancellation.
- Admin suspension and related pool changes.

A failed transaction must not leave partially updated records.

## 8. Frontend component testing

Use Vitest and React Testing Library.

Priority components include:

- Authentication forms.
- OTP verification form.
- Profile editor.
- Destination selector.
- Pool creation form.
- Pool discovery filters.
- Pool cards.
- Pool detail view.
- Join confirmation.
- Notification list.
- Report and block controls.
- Admin management components.

Test loading, success, error, and empty states where applicable.

## 9. User-flow testing scope

The selected V1 end-to-end testing scope prioritizes:

1. Registration.
2. OTP verification.
3. Login.
4. Profile completion.
5. Access to the authenticated application.

Pool and safety behavior will receive separate backend integration and business-logic testing.

This distinction keeps the initial browser automation scope manageable while preserving automated coverage of critical pool behavior.

## 10. Pool capacity and concurrency testing

Pool capacity enforcement is a critical ShareKar requirement.

Test multiple users attempting to join the same pool at approximately the same time.

Example:

- A pool has capacity 3.
- The creator already occupies one seat.
- Two seats remain.
- Several users submit join requests simultaneously.

Expected result:

- No more than two additional users can join.
- Total active membership never exceeds three.
- Rejected users receive a meaningful error response.
- No duplicate active membership is created.
- Database state remains consistent.

Also test simultaneous attempts by the same user to join different pools.

The system must enforce one active pool participation per user.

Concurrency tests must use a real PostgreSQL database and exercise the actual transaction and constraint strategy.

## 11. Pool lifecycle testing

Test all approved pool states:

- `OPEN`
- `READY`
- `EXPIRED`
- `CANCELLED`

Test the following scenarios:

1. Immediate pool creation.
2. Capacity-1 pool becoming ready immediately.
3. Scheduled pool creation.
4. Member joining.
5. Member leaving.
6. Joining deadline reached.
7. Scheduled departure reached before joining deadline.
8. Pool becoming ready when the deadline is reached and at least one active member remains.
9. Pool expiring when no active members remain.
10. Creator ending waiting early.
11. Creator cancelling a pool.
12. Ready pool automatically closing after 30 minutes.
13. Deadline extension.
14. Pickup and departure locking.
15. Creator leaving and automatic pool cancellation.

Background-job tests must verify idempotency, including repeated execution of the same lifecycle job.

## 12. Membership, account, and moderation testing

Test the interactions between pool membership and account state.

Important scenarios:

- A user cannot participate in two active pools.
- A creator is automatically added as a member.
- A user who leaves an open pool may rejoin when eligible.
- A user cannot voluntarily leave a ready pool.
- A suspended user loses application access.
- Suspension cancels created pools and removes participation from joined pools according to approved rules.
- Account deletion applies the normal pool cancellation rules.
- Admin removal is permission-controlled and audited.
- Blocking two users does not automatically alter an existing shared active pool.
- Reporting does not automatically penalize or remove a user.

All of these rules must be enforced by the backend.

## 13. Visibility and eligibility testing

Test both frontend display behavior and backend authorization.

### General pools

Verify that eligible authenticated users can discover and join general pools.

### Women-only pools

Verify that:

- Eligible users can discover women-only pools.
- Ineligible users cannot discover or join them.
- Direct API requests cannot bypass eligibility.
- Eligibility is recalculated when profile gender changes.
- Gender changes are rejected while the user has active pool participation.

### Blocking

Verify that applicable blocked-user interactions are prevented on the backend.

Frontend hiding alone is not sufficient.

## 14. Geographic and time-matching testing

Test the matching rules and their boundaries.

### 14.1 Pickup radius

- Default radius is 1 km.
- User-selected radius is respected.
- Users outside the radius are not included.
- Boundary coordinates are tested.
- Invalid latitude and longitude values are rejected.

Use straight-line geographic distance.

### 14.2 Destination matching

Only pools with the exact matching `destinationId` should qualify for the selected destination.

### 14.3 Departure-time matching

The default matching window is 15 minutes around the selected departure time.

Test:

- Exact matching time.
- Just inside the window.
- Exactly at the boundary.
- Just outside the window.
- Different departure dates.
- Invalid time values.

### 14.4 Time-zone handling

- Store timestamps in UTC.
- Display dates and times in `Asia/Kolkata` for the initial launch.
- Test UTC-to-local conversion.
- Test date boundaries and scheduled jobs.

## 15. Authentication and security testing

Test:

- OTP expiration.
- Incorrect OTP attempts.
- OTP reuse.
- OTP resend behavior.
- Refresh-token rotation.
- Refresh-token revocation.
- Logout.
- Logout from all sessions.
- Access after account suspension.
- Access after account deactivation.
- Unauthorized access to protected endpoints.

Also test:

- Invalid request payloads.
- Missing authentication.
- Insufficient permissions.
- Rate limiting.
- CORS configuration.
- CSRF protection for cookie-authenticated state-changing requests.
- Access to another user's private resources.
- Admin route authorization.
- Sensitive information leakage through error responses and logs.

Security testing should cover common application risks appropriate to the V1 architecture.

## 16. Performance testing

Perform basic load testing for critical APIs.

Priority endpoints:

- Authentication.
- Pool discovery.
- Pool creation.
- Pool joining.
- Pool details.
- Notification retrieval.

Evaluate:

- Response time.
- Error rate.
- Database query performance.
- Behavior under concurrent requests.
- Database connection usage.

Do not assume a specific user capacity until testing has produced measurable results.

Large-scale stress and endurance testing are outside the initial V1 scope.

## 17. Error and failure testing

Test normal and failure scenarios.

Examples:

- Invalid request data.
- Missing required fields.
- Invalid resource IDs.
- Expired authentication tokens.
- Database unavailable.
- Database transaction failure.
- Email provider unavailable.
- Cloudinary upload failure.
- Push notification delivery failure.
- Network interruptions.
- Background scheduler interruption.
- Backend restart while jobs are pending.

The system must fail safely.

External notification or image services should not cause unrelated pool database operations to become inconsistent.

Background jobs must support retry or reconciliation where appropriate.

## 18. End-to-end testing

Use Playwright for critical browser-based flows.

The initial E2E scope focuses on:

- Registration.
- OTP verification using a controlled test mechanism.
- Login.
- Profile completion.
- Authenticated application access.

Additional browser-based E2E journeys can be added as the frontend stabilizes.

Pool business rules must still be covered by automated unit and integration tests even when a particular flow is not initially automated through Playwright.

## 19. Test data management

Use automated seed scripts and isolated test data.

Rules:

- Do not use production user data.
- Use predictable test fixtures.
- Create test users with different eligibility states.
- Create destinations for different matching scenarios.
- Create pools in different lifecycle states.
- Clean up test data between test runs where appropriate.
- Keep automated tests independent of execution order.

Test accounts and OTPs must be isolated from real authentication flows.

## 20. Continuous integration

Use GitHub Actions.

Automated checks should run on pushes to both `development` and `main`.

Recommended pipeline:

1. Install dependencies.
2. Validate formatting.
3. Run ESLint.
4. Run TypeScript type checking.
5. Start or connect to the test PostgreSQL database.
6. Apply test migrations.
7. Run unit tests.
8. Run backend integration tests.
9. Run frontend component tests.
10. Run configured E2E tests.

The pipeline must report failures clearly.

The workflow should use supported free-tier GitHub Actions usage and must not require paid services or payment-card registration.

## 21. Release acceptance criteria

A feature is ready to merge into `main` when:

- Its implementation matches the approved requirements.
- Relevant automated tests pass.
- Manual verification is complete.
- No known critical or high-severity defects remain unresolved.
- Database migrations have been tested where applicable.
- API errors and validation behave correctly.
- Documentation has been updated where necessary.

The full application does not need every future test to be complete before every small merge. However, all relevant tests for the changed functionality must pass.

## 22. Production smoke testing and monitoring

After deployment, verify:

- Application availability.
- Backend health endpoint.
- Database connectivity.
- Authentication availability.
- Core API functionality.
- Critical frontend routes.
- Error monitoring.
- Basic uptime monitoring.

Use free, no-card services where available.

Production smoke tests must be safe and must not create unwanted pools or notify real users.

## 23. Defect management

When a defect is found:

1. Record the issue in Jira.
2. Include steps to reproduce.
3. Record expected and actual behavior.
4. Include relevant logs or screenshots without exposing sensitive information.
5. Assign severity.
6. Fix the issue on `development`.
7. Add a regression test where practical.
8. Retest the affected functionality.
9. Merge into `main` after verification.

Critical defects affecting authentication, account security, pool capacity, membership eligibility, or data integrity must be resolved before release.

## 24. Testing priorities for V1

Recommended priority order:

| Priority | Area |
|---|---|
| Critical | Authentication and account access |
| Critical | Pool creation and membership |
| Critical | Capacity and concurrent joining |
| Critical | Pool lifecycle and deadlines |
| Critical | Eligibility and authorization |
| High | Database integrity and transactions |
| High | Blocking and reporting |
| High | Notifications and scheduled jobs |
| Medium | Frontend components |
| Medium | Admin dashboard |
| Medium | Basic performance |
| Medium | Browser compatibility |

## 25. V1 testing exclusions

The following are outside the initial testing scope because the corresponding product capabilities are excluded from V1:

- Driver booking and driver integrations.
- Fare calculation and fare splitting.
- Online payments.
- Passenger chat.
- Live GPS tracking.
- SOS functionality.
- Large-scale distributed load testing.

These areas require a separate testing plan if introduced in a future version.

## 26. Approval

This document defines the proposed testing strategy for ShareKar V1.

**Status:** Draft — approved