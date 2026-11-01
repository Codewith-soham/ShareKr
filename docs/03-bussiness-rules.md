# 03 — Business Rules

**Project:** ShareKar  
**Document:** Business Rules  
**Version:** 1.0 — Draft for Review  
**Product stage:** V1 — Local MVP  
**Initial launch area:** NL Complex and nearby areas, Dahisar East, Mumbai  
**Status:** Pending approval

---

## 1. Purpose

This document defines the operational rules, validations, lifecycle transitions, permissions, and edge-case behaviour for ShareKar V1.

It supplements the Product Requirements Document (PRD). The PRD defines what the product must do; this document defines how the system must behave when users interact with it.

All business-critical rules must be enforced by the backend. Frontend validation is supplementary and must never be treated as the source of truth.

## 2. Core terminology

| Term | Definition |
|---|---|
| Pool | A group of passengers intending to travel together to the same destination. |
| Creator | The user who creates a pool. |
| Member | A user who has successfully joined a pool. |
| Capacity | Maximum number of passengers permitted in a pool, including its creator. |
| Pickup | The single fixed meeting location for all pool members. |
| Destination | An administrator-managed destination selected by users. |
| Joining deadline | The latest time at which a user can join an open pool. |
| Ready | A pool that has met its capacity requirements and is eligible to depart. |
| Active membership | A user's current participation in a pool. |
| Active pool | A pool in which a user has an active membership, subject to the lifecycle rules below. |

## 3. User eligibility and account rules

### 3.1 Registration requirements

A user must complete registration with:

- Full name
- Email address
- Phone number
- Verified phone number through SMS OTP
- Gender: Male, Female, or Other
- Profile image

All fields are mandatory.

Google authentication may be supported, but it does not replace phone verification.

### 3.2 Access restrictions

- Guest access is not permitted.
- Unauthenticated users cannot discover, view, create, or join pools.
- Only active, phone-verified users with complete profiles can create or join pools.
- Suspended users cannot access protected application functionality.
- The backend must validate account status and phone verification for every protected operation.

### 3.3 Women-only pool eligibility

- Users who select Female during registration are eligible to create and join women-only pools.
- Users selecting Male or Other cannot create or join women-only pools.
- Eligibility is based on the user's current gender profile in V1.
- No government ID verification is required in V1.
- The backend must enforce eligibility during pool discovery, creation, and joining.
- Gender cannot be changed while the user has an active pool membership.
- Once the user has no active memberships, gender can be changed and eligibility recalculated.

The application must not describe V1 women-only pools as identity-verified or guarantee participant identity.

### 3.4 One-active-pool restriction

A user may participate in only one active pool at a time, either as creator or passenger.

- The restriction applies across all pools.
- A user cannot create or join another active pool while already participating in one.
- The backend must enforce this rule transactionally to prevent simultaneous requests from bypassing it.
- Historical memberships do not count as active memberships.

## 4. Destination rules

- Users must select destinations from the administrator-managed destination directory.
- Users cannot directly create arbitrary destinations.
- Users can submit requests for missing destinations.
- Administrators can add, edit, activate, or deactivate destinations.
- A user cannot create or join a pool for an inactive destination.
- Pool matching uses the exact `destination_id`.
- Different destination records are treated as different destinations, even if their names are similar.

## 5. Pickup rules

### 5.1 Pickup selection

The creator must select one pickup location when creating a pool.

Supported selection methods:

- Current GPS location
- Map selection
- Manual address search

The system stores:

- Pickup address
- Latitude
- Longitude

### 5.2 Pickup proximity

- Default pickup search radius: 1 kilometre.
- Users can select a different search radius.
- Pickup proximity is calculated using straight-line geographic distance between coordinates.
- Road distance is not calculated in V1.
- Distance calculations must use valid geographic coordinates.

### 5.3 Pickup locking

- The creator can change the pickup while no additional passenger has joined.
- When the first additional passenger successfully joins, pickup becomes locked.
- After locking, the creator and members cannot change the pickup.
- All members must use the same fixed pickup location.
- A pickup change made before locking must be reflected in subsequent pool discovery and details.

### 5.4 No live tracking

- GPS is used only when a user chooses it for pickup selection.
- Continuous location tracking is not implemented.
- The application does not track whether a passenger reaches the pickup or completes the journey.

## 6. Pool creation rules

### 6.1 Required information

A creator must provide:

- Destination
- Pickup location
- Pool visibility: General or Women-only
- Journey type: Immediate or Scheduled
- Capacity
- Joining deadline or scheduled departure details, as applicable

The creator is automatically added as the first pool member.

### 6.2 Capacity

- Minimum capacity: 1 passenger.
- Maximum capacity: 3 passengers.
- Capacity includes the creator.
- The creator chooses a total capacity of 1, 2, or 3.
- Capacity cannot be changed after another passenger joins.
- The backend must never allow active membership to exceed the configured capacity.

### 6.3 Capacity of 1

If the creator selects capacity 1:

- The pool becomes Ready immediately after creation.
- No joining period is required.
- No additional passenger can join.
- The 30-minute Ready-state auto-close rule applies.

### 6.4 Duplicate pool warning

Before creating a pool, the system checks for similar active pools.

Similarity may be based on:

- Same destination
- Similar departure time
- Pickup locations within a reasonable proximity

If a similar pool exists:

- Show a warning and relevant pool information.
- Allow the creator to continue creating the new pool.
- Do not automatically merge pools or prevent creation.

## 7. Journey types and deadlines

### 7.1 Immediate pools

- Default joining period: 5 minutes.
- Creator may choose a joining period between 1 and 15 minutes.
- The joining deadline is calculated from pool creation time.
- The creator can extend the deadline while the pool remains Open.
- The creator cannot shorten the deadline.
- The updated deadline must be in the future.
- Once another passenger joins, departure time and pickup become locked.
- At the joining deadline, the system evaluates active membership.

### 7.2 Scheduled pools

The creator selects:

- Future departure date and time
- Joining deadline

Rules:

- The joining deadline must be before the scheduled departure time.
- The creator can extend the joining deadline while the pool remains Open.
- The creator cannot shorten the deadline.
- The revised deadline must remain in the future and before departure.
- Departure time becomes locked when another passenger joins.
- Pickup also becomes locked when another passenger joins.

### 7.3 Deadline expiration

When the joining deadline is reached:

- If the pool has at least one active member, it becomes Ready.
- If no active members remain, it becomes Expired.
- The system stops accepting new members.
- The resulting status is recorded in pool history and event history.
- Relevant users receive notifications.

### 7.4 Departure time arrives before deadline

If a scheduled pool reaches its departure time while it is still Open:

1. Stop accepting new members immediately.
2. Evaluate the current active membership.
3. If at least one active member remains, mark the pool Ready.
4. Otherwise, mark the pool Expired.
5. Notify affected users and record the lifecycle event.

A pool must never continue accepting new passengers after its scheduled departure time.

## 8. Pool discovery and matching

### 8.1 Matching conditions

A pool may appear in a user's matching results when:

- Its destination ID matches the selected destination.
- Its pickup falls within the selected search radius.
- Its departure time falls within the configured matching window.
- Its visibility permits the user to discover it.
- The user is not blocked by or blocking a relevant participant.
- The user meets account and pool eligibility requirements.

### 8.2 Departure-time matching

- Default departure-time matching window: 15 minutes.
- Pools outside the selected matching window are not included in matching results.
- Users can manually adjust search date and time.
- Users can filter by journey type and pool visibility.

### 8.3 Search origin

Users can search from:

- Their current GPS location
- A manually selected location

The application must not require continuous GPS tracking.

### 8.4 Full and closed pools

- Full pools may remain visible with a Full status.
- Closed pools may remain visible with their relevant status.
- Join controls must be disabled for Full, Ready, Expired, and Cancelled pools.
- The backend must independently reject invalid join requests, even if the frontend displays an outdated Join button.

### 8.5 Women-only discovery

Only eligible users can discover women-only pools.

The backend must enforce this restriction; hiding a pool in the frontend alone is insufficient.

## 9. Pool joining rules

### 9.1 Information visible before joining

Before joining, a user may see:

- Destination
- Fixed pickup location
- Departure date and time
- Available seats
- Pool type
- Creator's first name and last initial
- Creator's profile image
- Pool status

Example creator display: `Soham K.`

Full member details are available only after successful joining.

### 9.2 Joining process

1. User selects a pool.
2. Application displays pool details.
3. User taps Join.
4. Application asks for confirmation.
5. Backend validates all joining conditions.
6. If valid, user is added as an active member.
7. Creator and existing members receive a join notification.
8. If this is the first additional member, pickup and departure time are locked.

Joining does not require creator approval.

### 9.3 Backend validation

Before accepting a join request, verify:

- User is authenticated.
- Account is active.
- Phone is verified.
- Mandatory profile is complete.
- User is eligible for the pool visibility.
- User is not already an active member of the pool.
- User has no other active pool membership.
- Pool is Open.
- Joining deadline has not passed.
- Scheduled departure time has not passed.
- Capacity has not been reached.
- User is not blocked by or blocking a relevant member.
- Pool destination and other required records are valid.

### 9.4 Simultaneous joining

Joining must use an atomic capacity check.

If multiple users attempt to join the last available seat:

- Only one request succeeds.
- Other requests fail with a clear Pool Full response.
- The unsuccessful user can refresh discovery results.
- No waiting list is maintained in V1.

### 9.5 Duplicate membership

- A user cannot have more than one active membership in the same pool.
- A user who previously left an Open pool may rejoin if seats are available and the joining deadline has not passed.
- Rejoining creates a new membership history record.
- Previous membership records must not be overwritten.

## 10. Invitation links

### 10.1 Invitation creation

A pool member can share an invitation link for an existing pool.

The invitation:

- Does not reserve a seat.
- Does not bypass registration.
- Does not bypass phone verification.
- Does not bypass gender or visibility restrictions.
- Does not bypass capacity or one-active-pool restrictions.

### 10.2 Logged-out users

When an unauthenticated user opens an invitation link:

1. Redirect to login or registration.
2. Complete registration and phone verification.
3. Return the user to the invited pool.
4. Display the current pool details.
5. Revalidate all joining conditions before joining.

### 10.3 Invalid invitations

Joining through an invitation must fail if:

- Pool no longer exists or is unavailable.
- Pool is Full, Ready, Expired, or Cancelled.
- Joining deadline has passed.
- Departure time has passed.
- User is ineligible.
- User is already participating in another active pool.
- User is blocked from interacting with a pool participant.

An invitation link must not bypass normal discovery and joining permissions.

## 11. Pool locking rules

The following fields become locked when the first additional passenger successfully joins:

- Pickup location
- Departure date and time
- Capacity

The creator cannot change these fields after locking.

The joining deadline can be extended while the pool is Open, subject to the deadline rules.

Once the pool leaves Open status, no joining or pool configuration changes are permitted, except creator cancellation and authorized administrative actions.

## 12. Pool lifecycle

### 12.1 Pool statuses

| Status | Meaning |
|---|---|
| Open | Accepting eligible members. |
| Ready | Capacity requirements met; eligible to depart. |
| Expired | Joining deadline or departure time reached without meeting the required membership condition. |
| Cancelled | Creator or authorized administrative action cancelled the pool. |

There is no Completed status in V1.

### 12.2 Lifecycle transitions

| Current status | Event | Result |
|---|---|---|
| Open | Capacity 1 pool created | Ready |
| Open | Joining deadline reached, active members ≥ 1 | Ready |
| Open | Joining deadline reached, active members = 0 | Expired |
| Open | Scheduled departure reached, active members ≥ 1 | Ready |
| Open | Scheduled departure reached, active members = 0 | Expired |
| Open | Creator cancels | Cancelled |
| Open | Creator leaves | Cancelled |
| Ready | Creator cancels | Cancelled |
| Ready | 30-minute auto-close threshold reached | Closed/expired for further interaction |
| Any applicable status | Authorized admin cancellation | Cancelled |

**Implementation note:** The current four-status model needs one technical decision before database implementation: Ready pools that reach their 30-minute auto-close threshold should have a persistent terminal status. The recommended V1 implementation is to use `Expired` with a recorded reason such as `READY_TIMEOUT`, while preserving the previous Ready state in the event history. This avoids introducing a fifth status solely for auto-close.

### 12.3 Ready-state behaviour

- Ready means the pool met the required membership condition.
- Ready does not confirm that the journey occurred.
- Members can view pool details and coordinate at the pickup point.
- No new members can join.
- Ready pools automatically close after 30 minutes.
- The creator can cancel a Ready pool before auto-close.
- A cancellation confirmation is required.
- Cancellation reason is optional.
- All members are notified of cancellation.
- Cancellation is recorded in history and event logs.

### 12.4 Early readiness

The creator may end waiting early and mark the pool Ready only when the required minimum capacity is met.

If the required minimum is not met, the creator cannot force the pool into Ready status.

### 12.5 Creator cancellation

The creator may cancel a pool at any time, including when Ready.

For Ready pools:

- Show a confirmation prompt.
- Allow an optional cancellation reason.
- Cancel the pool only after confirmation.
- Notify all members.
- Cancel pending scheduled reminders.
- Preserve the cancellation record.

### 12.6 Creator leaving

- If the creator leaves an Open pool, the entire pool is automatically cancelled.
- Notify all active members.
- Do not transfer ownership to another member.
- Record the cancellation and reason in pool event history.

### 12.7 Passenger leaving

- Members can leave an Open pool.
- The pool remains Open after a passenger leaves.
- Active membership count is evaluated at the deadline.
- A passenger who leaves may rejoin before the deadline if capacity and eligibility permit.
- Members cannot voluntarily leave a Ready pool under the current V1 rules.
- The creator can cancel a Ready pool.

## 13. Account deletion and suspension

### 13.1 Account deletion

Users can request account deletion directly from the application.

If the user is participating in an active pool:

- If creator, cancel the entire pool.
- If passenger, remove their active membership according to normal lifecycle rules.
- Notify affected members.
- Record all actions in history.

After pool handling:

- Deactivate the account and log the user out.
- Invalidate active sessions.
- Begin the data deletion/anonymization process after the defined retention period.
- Retain records where required for legal, security, fraud-prevention, or audit purposes.

The exact retention period must be established before production launch.

### 13.2 Admin suspension

When an administrator suspends a user:

- Suspend the account immediately.
- Invalidate active sessions and tokens.
- Deny further application access.
- Cancel all pools created by that user.
- Remove the user's participation from pools they joined, applying the relevant lifecycle rules.
- Notify affected pool members.
- Record all administrative actions in audit history.

A suspended user remains unable to access the application until reinstated.

## 14. Blocking and reporting

### 14.1 Blocking

A user can block another user.

Blocking prevents:

- Discovering each other's pools.
- Joining the same future pool.
- Interacting through future pool activities.

If both users are already in the same active pool:

- Existing pool membership remains unchanged.
- Neither user is automatically removed.
- The pool is not automatically cancelled.
- Blocking applies to future discovery and interactions.

The backend must enforce blocking rules.

### 14.2 Reporting

Users can report:

- Other users.
- Pools.

A report may include:

- Reason
- Optional description
- Relevant pool reference

Reporting does not automatically suspend, remove, or penalize the reported user.

Administrators review reports and decide whether action is required.

## 15. Notifications

Notifications are generated for relevant pool and account events.

### 15.1 Pool events

Notify affected users when:

- A member joins.
- A member leaves.
- A pool becomes Ready.
- A pool expires.
- A pool is cancelled.
- A scheduled departure approaches.

### 15.2 Scheduled reminders

Scheduled pools receive reminders:

- 10 minutes before departure.
- 5 minutes before departure.

Do not send reminders to:

- Users who have left the pool.
- Users removed by an authorized administrator.
- Users whose pool has been cancelled.
- Users whose account is no longer eligible to receive notifications.

### 15.3 Notification delivery

- In-app notifications are supported.
- Push notifications are sent where supported and permission has been granted.
- Notification delivery failure must not roll back a successful pool operation.
- Notification processing should be retryable and must avoid duplicate event notifications where practical.

## 16. Fare and payment rules

- ShareKar does not calculate or estimate fares in V1.
- ShareKar does not collect or split fares.
- No online payment is supported.
- Passengers arrange the fare directly with the auto driver.
- ShareKar does not hire, assign, book, or manage drivers.
- ShareKar does not provide driver accounts or driver integration.
- The application must not imply that an auto or driver is guaranteed.

## 17. Pool history and auditability

Users can view pools they created or joined.

History includes:

- Destination
- Pickup location
- Departure date and time
- Pool members and participation details
- Pool status
- Relevant lifecycle events

Historical membership records must be retained when users leave or rejoin.

Pool events should record important actions, including:

- Pool creation
- Member join
- Member leave
- Pickup/departure locking
- Deadline extension
- Ready transition
- Expiration
- Cancellation
- Administrative removal
- Account-related pool actions

Pool event history is append-only for ordinary users.

## 18. Administrative permissions

Only authorized administrators can access the admin dashboard.

Administrators can:

- View and manage user accounts.
- Suspend and reinstate accounts.
- Add, edit, activate, and deactivate destinations.
- Review and resolve reports.
- View pool details for support and moderation.

Administrative actions must be permission-controlled and auditable.

## 19. Feedback

Users can submit:

- Suggestions
- Technical problems
- General experience feedback

Feedback can be submitted through a dedicated feedback section and optional prompts after relevant pool events.

Administrators can review submitted feedback.

Star ratings and public user ratings are not part of V1.

## 20. Localization

V1 supports:

- English
- Hindi

Marathi may be introduced in a later release.

## 21. Backend enforcement and consistency

The backend is the source of truth for all business rules.

The implementation must ensure:

- Capacity checks are atomic.
- One-active-pool restrictions are enforced transactionally.
- Only eligible users can join women-only pools.
- Pickup and departure locking cannot be bypassed.
- Deadline and departure-time checks use consistent server-side time.
- Pool status transitions are validated.
- Duplicate active membership is prevented.
- Suspended accounts cannot perform protected actions.
- Blocking is enforced during discovery and joining.
- Administrative actions are authorized and logged.

Background jobs must process deadline expiration, Ready-state auto-close, and scheduled reminders reliably.

A background job must be safe to retry without creating duplicate transitions or notifications.

## 22. V1 exclusions

The following are explicitly outside V1:

- Driver accounts and driver integrations
- Driver booking or assignment
- Live journey tracking
- Continuous GPS tracking
- Fare estimates and fare splitting
- Online payments
- In-app chat
- SOS functionality
- Government ID verification
- Public ratings and reviews
- Multiple pickup points per pool
- Ownership transfer
- Completed journey confirmation
- Waiting lists
- Arbitrary user-created destinations
- Automatic pool merging

## 23. Open implementation decisions

The following details must be finalized before the relevant production features are implemented:

1. **Ready-state auto-close representation:** Recommended to transition to `Expired` with reason `READY_TIMEOUT`, preserving Ready in event history.
2. **Account data retention period:** Define the exact retention period and deletion/anonymization policy.
3. **Invitation link security:** Define token format, expiration, revocation, and abuse protection.
4. **Admin removal semantics:** Define whether removing a passenger from an Open pool can leave the pool Open, and how it affects the creator's capacity requirements.
5. **Minimum capacity for capacity 2 or 3:** Recommended to use 1 as the minimum active membership count, consistent with the confirmed rule that a pool with one active member can become Ready at deadline. Confirm whether the creator's selected capacity represents a maximum rather than a required target.
6. **Time zone:** Store timestamps in UTC and display them in the user's local time zone; the initial launch uses Asia/Kolkata.

## 24. Approval

This document is a draft until explicitly approved.

**Document owner:** ShareKar project owner  
**Version:** 1.0  
**Status:** Pending review

Once approved, this document becomes the V1 Business Rules baseline. Any subsequent changes should be recorded as explicit requirement changes and reflected in the relevant product and technical documents.