# ShareKar — Product Requirements Document

**Document:** 02 — Product Requirements Document  
**Project:** ShareKar  
**Version:** 1.0  
**Status:** Approved  
**Product Stage:** V1 — Local MVP

---

## 1. Product Overview

ShareKar is a passenger coordination platform that connects commuters travelling to the same destination at similar times.

Users can create, discover, and join passenger pools. Members meet at an agreed pickup location and independently arrange an available auto ride.

The platform does not book autos, hire drivers, or process transportation payments.

## 2. Product Goals

The primary goals of V1 are:

1. Validate demand for local passenger coordination.
2. Help commuters discover people travelling in the same direction.
3. Provide reliable pool creation, discovery, joining, and lifecycle management.
4. Enforce eligibility, capacity, and safety rules on the backend.
5. Validate the product through a limited geographical pilot.

### Success Metric

Initial pilot target: **20 Daily Active Users**.

Meaningful activity includes creating, discovering, joining, or managing pools.

## 3. Geographic Coverage and Destinations

- Initial pickup coverage: NL Complex and nearby areas in Dahisar East, Mumbai.
- The supported pickup area will be managed by administrators.
- Destinations will be maintained in an admin-managed directory.
- Users can search and select existing destinations.
- Users cannot directly create arbitrary destinations.
- Users can submit requests for missing destinations.
- Administrators can review and add requested destinations.

## 4. Authentication and User Profiles

### Registration Requirements

Users must register and log in before accessing the main application.

Mandatory profile information:
- Full name.
- Email address.
- Phone number.
- Verified phone number according to the final authentication rollout.
- Gender.
- Profile image.

### Authentication

The product requirement is phone number and SMS OTP verification.

Google login may be supported, but Google authentication alone does not count as phone verification.

**Initial zero-cost pilot deviation:** Email OTP may be used temporarily until phone OTP can be supported. This is a pilot implementation deviation, not a replacement of the intended phone-verification requirement.

OTP rules:
- OTP validity: 5 minutes.
- Maximum incorrect attempts: 3.

### Profile Management

Users can edit:
- Full name.
- Email.
- Gender.
- Profile image.

Changing a phone number requires OTP verification of the new number.

Gender cannot be changed while the user has an active pool membership.

### Account Status

Supported account states:
- ACTIVE
- SUSPENDED
- DEACTIVATED

Suspended users must immediately lose application access. Existing sessions and tokens must be invalidated.

## 5. Pool Creation

Eligible users can create a pool.

### Required Information

- Destination.
- Pickup location.
- Journey type.
- Pool visibility.
- Departure date and time.
- Joining deadline.
- Total passenger capacity.

### Pickup Selection

Users can select a pickup location using:
- GPS location.
- Map selection.
- Manual address search.

The selected pickup location is stored with its address and coordinates.

Each pool has one fixed pickup point.

### Pool Capacity

The creator chooses a total capacity of:
- 1 passenger.
- 2 passengers.
- 3 passengers.

The creator counts as one passenger.

Capacity cannot be changed after another passenger joins.

### Immediate Pools

- Default joining timer: 5 minutes.
- Creator can choose a custom timer between 1 and 15 minutes.
- At the joining deadline, the pool becomes READY if at least one active member remains.
- Otherwise, the pool becomes EXPIRED.
- Capacity 1 pools become READY immediately after creation.

### Scheduled Pools

- Creator selects a future departure date and time.
- Creator selects a joining deadline.
- Joining stops when the deadline is reached.
- If the scheduled departure arrives before the joining deadline, joining stops and the pool is evaluated.
- If at least one active member remains, the pool becomes READY; otherwise, it becomes EXPIRED.

## 6. Pool Discovery and Search

Users can discover pools using:
- Destination.
- Date and departure time.
- Pickup proximity.
- Journey type.
- Pool visibility.

### Matching Rules

- Destination matching uses the exact destination ID.
- Default pickup search radius: 1 km.
- Users can select a different search radius.
- Departure-time matching uses a 15-minute window around the selected time.
- Pickup distance is calculated using straight-line coordinates.
- Search origin can be GPS-based or manually selected.

### Pool Visibility

Two visibility types are supported:
- GENERAL
- WOMEN_ONLY

Women-only pools are visible only to eligible users.

Full and closed pools can remain visible with their status, but joining must be disabled.

## 7. Joining a Pool

Users can join an eligible open pool if:
- The pool has available capacity.
- The joining deadline has not passed.
- The user is not already participating in another active pool.
- The user is eligible for the pool's visibility type.
- The user is not blocked by or blocking a relevant participant.
- The pool is still open.

Joining is automatic after user confirmation and successful backend validation. Creator approval is not required.

### Information Visible Before Joining

- Destination.
- Pickup location.
- Departure date and time.
- Available seats.
- Pool type.
- Creator's first name and last initial.
- Creator's profile image.

The full member list and member profiles are available after joining.

## 8. Pool Invitations

Pool members can share an invitation link.

Invitation links:
- Do not reserve seats.
- Do not bypass authentication.
- Do not bypass eligibility checks.
- Do not bypass capacity or deadline validation.

Logged-out invitees must register or log in and then return to the invited pool. All conditions are revalidated before joining.

## 9. Pool Locking and Editing

A pool initially allows the creator to edit pickup and departure details.

Once the first additional passenger joins:
- Pickup location becomes locked.
- Destination becomes locked.
- Departure time becomes locked.
- Capacity becomes locked.

The creator can extend the joining deadline while the pool is OPEN, but cannot shorten it. The new deadline must be in the future.

## 10. Pool Lifecycle

Supported pool statuses:
- OPEN
- READY
- EXPIRED
- CANCELLED

### Lifecycle Rules

- OPEN pools accept eligible members until their joining deadline or another closing condition.
- READY pools have met the minimum participation requirement.
- EXPIRED pools can no longer accept members.
- CANCELLED pools have been cancelled by the creator or an authorized administrator.

A READY pool automatically closes after 30 minutes. The database design represents this timeout using EXPIRED with an appropriate expiration reason.

READY does not mean the journey has been completed.

## 11. Participation Rules

- A user can participate in only one active pool at a time.
- The creator is automatically added as a pool member.
- Members can leave an OPEN pool.
- A user who leaves an OPEN pool may rejoin if the pool is still eligible and has capacity.
- When a member leaves, the pool remains OPEN.
- The pool is evaluated at its joining deadline.
- If the creator leaves, the entire pool is automatically cancelled.
- Members cannot voluntarily leave after the pool becomes READY.
- The creator can cancel a pool at any time, including after it becomes READY, after confirmation and with an optional reason.
- Only authorized administrators can remove a passenger.

## 12. Notifications

The application supports in-app and push notifications where supported and permitted by the user.

Notification events include:
- Member joins.
- Member leaves.
- Pool becomes READY.
- Pool expires.
- Pool is cancelled.
- Scheduled departure approaches.

Scheduled pool reminders:
- 10 minutes before departure.
- 5 minutes before departure.

Notifications must be cancelled or suppressed when the user leaves the pool or the pool is cancelled.

## 13. Safety and User Trust

V1 includes:
- User reporting.
- Pool reporting.
- User blocking.
- Basic user profiles.
- Member list visibility for joined pools.

### Women-Only Pool Eligibility

V1 uses self-declared gender eligibility.

Users selecting Female during registration can create and join women-only pools.

Users selecting Male or Other cannot create or join women-only pools.

Eligibility must be enforced by the backend.

V1 does not provide government ID verification and does not guarantee user identity or passenger safety.

### Blocking

When two users block one another:
- They cannot discover each other's pools.
- They cannot join the same future pool.
- They cannot interact through future pool activities.

If both users are already in the same active pool when a block is created, the existing pool remains unchanged.

### Reporting

Users can report other users or pools.

Reporting does not automatically remove users or penalize accounts. Administrators review reports and take appropriate action.

## 14. Fare and Payment Policy

ShareKar does not:
- Display fare estimates.
- Calculate fares.
- Split fares.
- Collect payments.
- Process transportation transactions.

Passengers independently find an available auto and arrange the fare directly with its driver.

## 15. Pool History

Users can view pools they created or joined.

History includes:
- Destination.
- Pickup location.
- Departure date and time.
- Members.
- Pool status.
- Participation details.

V1 does not verify whether a journey actually occurred and does not include a journey-completed status.

## 16. Feedback

Users can submit:
- Suggestions.
- Technical problems.
- General experience feedback.

Feedback is available through a dedicated section and optional prompts after relevant pool events.

Administrators can review feedback.

V1 does not include star ratings.

## 17. Admin Dashboard

The admin dashboard is restricted to authorized administrators.

Admin capabilities:
- View and manage users.
- Suspend user accounts.
- Manage destinations.
- Review destination requests.
- View and moderate pools.
- Review and resolve reports.
- Review user feedback.

Admin access and permissions must be enforced by the backend.

## 18. Account Deletion and Suspension

### Account Deletion

Account deletion follows a two-stage process:

1. Immediately deactivate the account and log the user out.
2. Apply normal pool cancellation and participation rules.
3. Schedule eligible personal data for deletion or anonymization after a defined retention period.
4. Retain records where legally or operationally required for security and audit purposes.

The exact retention period must be defined before production launch.

### Admin Suspension

When an administrator suspends a user:
- All active sessions and tokens are invalidated.
- All pools created by that user are cancelled.
- The user is removed from pools they joined according to the approved lifecycle rules.
- Affected members are notified.
- The action is recorded for audit.

## 19. Localization

V1 language support:
- English.
- Hindi.

Marathi support is planned for a future version.

## 20. Non-Functional Requirements

### Security
- Backend authorization for all protected actions.
- Server-side validation of user input.
- Secure token handling.
- OTP rate limiting.
- Protection against unauthorized pool access.
- Session invalidation on suspension.

### Reliability
- Atomic pool joining.
- Database transactions for dependent writes.
- Capacity constraints enforced under concurrent requests.
- Idempotent background jobs.
- Centralized error handling.

### Performance
- Cursor-based pagination for large lists.
- Indexed database queries.
- Efficient pool discovery.
- Basic load testing for critical APIs.

### Maintainability
- TypeScript strict mode.
- Feature-based backend modules.
- Reusable frontend components.
- Prisma migrations.
- Automated tests.
- Structured logging.

## 21. Acceptance Criteria

V1 is considered functionally ready for pilot testing when:

- Users can register, authenticate, and complete their profiles.
- Users can create immediate and scheduled pools.
- Users can discover matching pools.
- Eligible users can join pools.
- Concurrent joining cannot exceed capacity.
- Pool lifecycle transitions follow approved business rules.
- One active pool per user is enforced.
- Women-only eligibility and blocking rules are enforced on the backend.
- Notifications are generated for supported pool events.
- Users can report users and pools.
- Administrators can manage destinations, users, pools, and reports.
- Account suspension invalidates access.
- Critical automated tests pass.
- Deployment and smoke testing are completed.

## 22. V1 Exclusions

The following are explicitly outside the V1 scope:

- Driver accounts and driver integrations.
- Auto booking or dispatch.
- Fare estimation or fare splitting.
- Online payments.
- Live journey tracking.
- In-app chat.
- Emergency SOS.
- Government ID verification.
- Journey completion verification.
- Favourite pickup locations.
- Star ratings.

## 23. Future Direction

Future versions may include:
- Phone OTP verification for the initial pilot's email OTP deviation.
- Government ID verification.
- Expansion into additional localities.
- More regional languages.
- Improved real-time updates.
- Enhanced safety and moderation.
- More advanced matching.

Future development will be guided by pilot feedback and observed user behaviour.

## 24. Approval

This document is the approved baseline for ShareKar V1 product requirements.

Changes to scope or business requirements should be reviewed and documented before implementation.

---

**End of Document 02**