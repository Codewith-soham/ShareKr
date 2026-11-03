# ShareKar — Product Requirements Document

**Document:** Product Requirements Document (PRD)  
**Version:** 1.0 — Draft  
**Product:** ShareKar (working name)  
**Release:** V1 — Local MVP  
**Initial launch area:** NL Complex and nearby areas, Dahisar East, Mumbai  
**Status:** Awaiting review and approval

---

# 1. Product Overview

## 1.1 Introduction

ShareKar is a passenger coordination platform that helps people travelling to the same destination at similar times find one another and share an independently available auto-rickshaw.

Users can create or discover travel pools, join a suitable pool, agree on a common pickup point, and travel together.

ShareKar does not book autos, hire drivers, provide transportation, or process ride payments. Passengers independently approach an available driver and arrange the fare directly.

## 1.2 Problem Statement

Many commuters travelling from residential areas to railway stations and other common destinations pay for an auto individually because they cannot easily find other passengers travelling in the same direction.

Although people may be willing to share an auto, they lack a convenient way to discover other passengers with matching destinations and departure times.

This can result in:
- Higher individual travel costs.
- Difficulty finding other passengers.
- Time spent waiting or searching for potential travel companions.
- Missed opportunities to share available transportation.

## 1.3 Product Vision

Make local commuting more affordable and convenient by connecting passengers travelling in the same direction.

## 1.4 Initial Target Audience

- Daily commuters.
- Students.
- Working professionals.
- Residents of NL Complex and nearby Dahisar East areas.
- People travelling to railway stations and other common destinations.

## 1.5 Value Proposition

ShareKar helps passengers:
- Discover people travelling to the same destination.
- Coordinate a shared pickup point.
- Find immediate or scheduled travel groups.
- Potentially reduce individual transportation expenses.
- Avoid depending entirely on informal word-of-mouth coordination.

---

# 2. Product Goals and Success Metrics

## 2.1 Primary Goals

1. Validate whether local commuters are willing to coordinate shared auto journeys.
2. Make creating and joining travel pools straightforward.
3. Provide reliable destination and departure-time matching.
4. Establish basic user trust and safety mechanisms.
5. Launch a functional local MVP without unnecessary complexity.

## 2.2 Pilot Success Target

**Target: 20 Daily Active Users (DAU).**

An active user is someone who regularly engages with a core product function, such as:
- Creating a pool.
- Discovering available pools.
- Joining a pool.
- Managing pool participation.

Simply registering or opening the application does not count as meaningful active usage.

## 2.3 Additional Metrics to Monitor

- Number of registered and phone-verified users.
- Daily and weekly active users.
- Pools created.
- Pools joined.
- Percentage of pools reaching ready status.
- Percentage of pools expiring.
- Average number of passengers per pool.
- Repeat participation.
- Cancellation frequency.
- Reports and blocked users.
- User feedback and technical issues.

---

# 3. Platform and User Access

## 3.1 Authentication Requirement

Authentication is mandatory.

Users cannot browse, discover, view, create, or join pools without logging in and completing phone verification.

Guest browsing is not supported in V1.

## 3.2 Authentication Methods

- Phone number with SMS OTP verification.
- Google login, if supported by the implementation.

Google login does not replace phone verification. Users signing in through Google must still verify their phone number using SMS OTP.

## 3.3 Mandatory Registration Fields

Every user must provide:

- Full name.
- Email address.
- Phone number.
- Verified phone number.
- Gender.
- Profile image.

All fields are mandatory before accessing the main application.

## 3.4 Gender Options

- Male
- Female
- Other

Gender is used for women-only pool eligibility.

## 3.5 Profile Image

Users can:
- Upload an image from their gallery.
- Capture an image using their device camera.

## 3.6 Profile Editing

Users can edit:
- Full name.
- Email.
- Gender.
- Profile image.

Changing a phone number requires OTP verification of the new number.

Gender cannot be changed while the user has an active pool participation. After active participation ends, gender can be changed and pool eligibility is recalculated.

## 3.7 Account Suspension

An administrator can suspend an account.

Upon suspension:
- The user is immediately logged out.
- Active sessions and tokens are invalidated.
- Backend access is denied.
- The user cannot access application features until reinstated.
- The application displays an appropriate suspension message.

## 3.8 Account Deletion

Users can request account deletion from Profile/Settings.

The process includes:
1. User initiates deletion.
2. Application requests confirmation.
3. Account is immediately deactivated and logged out.
4. Active pool participation is handled according to applicable pool cancellation rules.
5. Eligible personal data is deleted or anonymized after a defined retention period.
6. Necessary legal, security and audit records may be retained.

The exact retention period must be established before production launch.

---

# 4. Geographic Coverage and Destinations

## 4.1 Initial Pickup Coverage

The initial service area is:

**NL Complex and nearby areas in Dahisar East, Mumbai.**

The exact supported geographic boundary is managed by administrators.

Users cannot create pools outside the supported pickup coverage.

## 4.2 Destination Management

ShareKar supports multiple destinations within its supported geographical coverage.

Destinations are maintained through an administrator-managed directory.

Users can:
- Search existing destinations.
- Select a destination when creating a pool.
- Filter pools by destination.
- Request that a missing destination be added.

Users cannot directly create arbitrary destinations.

Administrators review destination requests and can add, edit, activate or deactivate destinations.

## 4.3 Destination Matching

Pools are matched using the exact destination record (`destination_id`).

Destinations with similar names but different destination IDs are not automatically treated as identical.

---

# 5. Pool Creation

## 5.1 Eligibility

A user can create a pool if:

- They are logged in.
- Their phone number is verified.
- Their mandatory profile is complete.
- Their account is active.
- They are not already participating in another active pool.
- They satisfy the selected pool's visibility eligibility requirements.

No administrator approval or minimum successful-journey history is required.

## 5.2 Pool Types

ShareKar supports two pool types.

### Immediate Pool

An immediate pool is created for passengers planning to travel shortly.

Rules:
- Default joining duration: 5 minutes.
- Creator can choose a custom duration from 1 to 15 minutes.
- The joining deadline is calculated from the creation time.
- At the deadline, the pool becomes ready if the minimum capacity requirement is met.
- Otherwise, it expires.

The creator can mark the pool ready early if the minimum capacity requirement is met.

### Scheduled Pool

A scheduled pool is created for a future departure.

Rules:
- Creator selects the departure date and time.
- Creator selects the joining deadline.
- The joining deadline must occur before departure.
- At the joining deadline, the pool becomes ready if the minimum capacity requirement is met.
- Otherwise, it expires.

Scheduled pools receive departure reminders 10 minutes and 5 minutes before departure.

## 5.3 Pool Capacity

- Minimum capacity: 1 passenger.
- Maximum capacity: 3 passengers total.
- The creator counts as one passenger.
- A pool can therefore contain the creator and up to two additional passengers.

A pool with only its creator can become ready because the minimum capacity is one.

## 5.4 Pickup Point

The creator selects one fixed pickup point using:

- Device GPS.
- Map selection.
- Manual address search.

The selected pickup point stores:
- Pickup address.
- Latitude.
- Longitude.

The pickup point is visible to eligible users before joining.

All members must agree to the same pickup point.

There are no multiple pickup points within one pool in V1.

## 5.5 Pool Destination

The creator selects a destination from the administrator-managed destination directory.

The destination cannot be changed after another passenger joins.

## 5.6 Pool Visibility

Two visibility types are supported:

**General pool**
- Visible to eligible users based on normal discovery rules.

**Women-only pool**
- Visible only to users eligible under the V1 women-only policy.
- Users selecting Female during registration are eligible.
- Male and Other users cannot create or join women-only pools.

V1 uses self-declared gender and does not include manual identity verification or government ID verification.

The product must not describe women-only access as verified identity or guaranteed safety.

## 5.7 Similar Pool Warning

Before creating a pool, the application checks for similar active pools.

Similarity can consider:
- Destination.
- Departure date and time.
- Pickup proximity.

If similar pools exist, the creator receives a warning.

The creator can still proceed with pool creation.

Duplicate pools are not automatically prohibited.

---

# 6. Pool Discovery and Search

## 6.1 Dashboard

After successful login, users land on a dashboard containing:

- Available pools.
- A prominent Create Pool action.
- Relevant pool discovery controls.

## 6.2 Automatic Discovery

The application automatically displays matching pools based on available matching information and the user's supported pickup area.

Users can also manually modify:
- Destination.
- Departure date and time.
- Journey type.
- Pool visibility.

## 6.3 Matching Conditions

Pool discovery considers:
- Supported pickup coverage.
- Exact destination ID.
- Departure date and time.
- Pool status.
- Available seats.
- Pool visibility eligibility.
- User blocking relationships.
- User's existing active pool participation.

Only joinable pools should be presented as available joining opportunities.

## 6.4 Pool Information Before Joining

Before joining, users can see:

- Destination.
- Fixed pickup point.
- Departure date and time.
- Available seats.
- Pool type.
- Pool visibility.
- Creator's name and profile image.

The full member list and member profiles are visible only after joining.

Creator history and previous pool statistics are not displayed before joining.

---

# 7. Joining a Pool

## 7.1 Joining Flow

1. User discovers a suitable pool.
2. User opens its details.
3. User reviews the pickup, destination, time and available seats.
4. User taps Join.
5. Application displays a confirmation.
6. User confirms.
7. Backend validates eligibility and availability.
8. User is automatically added to the pool.

Creator approval is not required.

## 7.2 Backend Validation

The backend must verify:

- User account is active.
- Phone number is verified.
- Mandatory profile is complete.
- User is not already in another active pool.
- User is not already an active member of the same pool.
- Pool is open.
- Joining deadline has not passed.
- Pool has available capacity.
- User satisfies visibility eligibility.
- No blocking relationship prevents participation.

## 7.3 Simultaneous Joining

Capacity validation must be atomic.

If multiple users attempt to join the final available seat simultaneously:
- Only one request can succeed.
- Other requests receive a Pool is full message.
- The application refreshes available pool results.

No waiting list is supported in V1.

## 7.4 One Active Pool per User

A user can participate in only one active pool at a time, whether as creator or passenger.

A user can create or join another pool after their current active participation ends.

Historical pool participation is retained.

---

# 8. Pool Locking and Changes

Once the first additional passenger joins:

- Pickup point becomes locked.
- Destination becomes locked.
- Departure date and time become locked.

The creator cannot change these details after locking.

If the creator needs to change them, the existing pool must be cancelled and a new pool created.

Before another passenger joins, the creator can modify applicable pool details, subject to the joining deadline and pool status.

---

# 9. Pool Lifecycle and Statuses

V1 supports four pool statuses:

| Status | Meaning |
|---|---|
| `open` | Pool is accepting eligible members |
| `ready` | Pool has met the minimum capacity requirement and is eligible to travel |
| `expired` | Joining deadline passed without meeting the minimum capacity requirement, or ready-pool time window ended |
| `cancelled` | Pool was cancelled by its creator or through an authorized administrative action |

There is no `completed` status in V1.

ShareKar does not track whether a journey actually occurred.

## 9.1 Automatic Ready Transition

At the joining deadline:
- If at least one active member remains, the pool becomes ready.
- Otherwise, the pool expires.

The creator can mark a pool ready early if the minimum capacity requirement is met.

## 9.2 Ready Pool Duration

A ready pool remains active for a maximum of 30 minutes.

After 30 minutes, it automatically transitions to `expired`.

A scheduled pool that reaches its departure time while ready remains ready until its 30-minute ready window ends.

## 9.3 Creator Cancellation

The creator can cancel a pool at any time, including after it becomes ready.

On cancellation:
- Pool status changes to `cancelled`.
- Cancellation is recorded in pool history.
- Active members receive notifications.
- Scheduled departure reminders are cancelled.

## 9.4 Member Leaving an Open Pool

A member can leave an open pool.

When a member leaves:
- Their membership is marked as left.
- The pool remains open.
- Remaining active capacity is evaluated at the joining deadline.

A user who leaves an open pool can rejoin if:
- The pool remains open.
- The deadline has not passed.
- A seat is available.
- The user has no other active pool participation.

Rejoining creates a new membership record.

## 9.5 Creator Leaving

If the creator leaves an open pool, the entire pool is automatically cancelled.

Ownership cannot be transferred.

## 9.6 Ready Pool Participation

Once a pool becomes ready, members cannot voluntarily leave through the normal leave-pool action.

The creator can still cancel the entire ready pool.

---

# 10. User Participation and Restrictions

- A user can participate in only one active pool at a time.
- A user can have only one active membership record per pool.
- Historical membership records must be retained.
- A creator is automatically added as a pool member.
- No ownership transfer is supported.
- No user can bypass pool capacity or eligibility rules through client-side manipulation.

The application must enforce these rules on the backend.

---

# 11. Notifications

## 11.1 Notification Channels

ShareKar supports:
- In-app notifications.
- Push notifications where supported and where permission has been granted.

## 11.2 Notification Events

Users receive notifications for:
- A new member joining their pool.
- A member leaving their pool.
- Pool becoming ready.
- Pool expiring.
- Pool cancellation.
- Scheduled departure approaching.

## 11.3 Scheduled Reminders

Scheduled pools send reminders:
- 10 minutes before departure.
- 5 minutes before departure.

Reminders must not be sent to users who have left the pool or when the pool has been cancelled.

## 11.4 Cancellation Notifications

When a pool is cancelled:
- All active members receive an in-app notification.
- Push notifications are sent where supported and permitted.
- The cancellation is recorded in pool history.

---

# 12. Safety and User Trust

## 12.1 Basic User Profiles

The application displays basic user profile information relevant to pool participation.

Pool details display a user's first name and last initial.

Example: `Soham K.`

The user's full name remains available in their private account profile.

## 12.2 Member List

The full member list and member profiles are visible only to users who have joined the pool.

## 12.3 User Reporting

Users can report:
- Other users.
- Pools.

Reports include:
- Report reason.
- Optional description.
- Reporter.
- Reported user and/or pool where applicable.
- Report status.
- Creation timestamp.

Reports are available to administrators for review.

Reporting does not automatically remove or penalize the reported user.

## 12.4 Blocking

Users can block other users.

Blocking prevents:
- Discovering each other's pools.
- Joining each other's future pools.
- Future interactions through pool activities.

Blocking is enforced by the backend.

If two users are already members of the same active pool:
- The existing pool remains unchanged.
- Blocking does not automatically remove either user.
- The pool is not automatically cancelled.

## 12.5 Women-only Pool Policy

V1 eligibility is based on self-declared gender.

No government ID verification, manual verification or guaranteed safety claim is included in V1.

Future versions may introduce additional verification mechanisms.

## 12.6 Safety Exclusions

V1 does not include:
- SOS functionality.
- Live journey tracking.
- Continuous GPS tracking.
- Identity-document verification.
- In-app chat.
- Guaranteed passenger or driver identity verification.

---

# 13. Fare and Payment Policy

ShareKar does not manage transportation payments in V1.

The application does not include:
- Fare estimates.
- Fare entry.
- Fare splitting.
- Online payments.
- Driver accounts.
- Driver booking.
- Driver integration.
- Driver hiring.

Passengers independently approach an available auto-rickshaw driver and arrange the fare directly.

ShareKar only coordinates passengers.

---

# 14. Pool History

Users can view pools they created or joined.

Pool history includes:
- Destination.
- Pickup address.
- Departure date and time.
- Members.
- Pool status.
- User's participation details.
- Relevant pool activity history.

V1 does not record journey completion.

A ready pool means the passengers were eligible to travel together; it does not confirm that they actually travelled.

---

# 15. Feedback

Users can submit:
- Suggestions.
- Technical problems.
- General experience feedback.

Feedback is accessible through a dedicated application section.

Optional feedback prompts may appear after pool events such as:
- Ready.
- Expired.
- Cancelled.

V1 does not include star ratings or public user reviews.

Administrators can review submitted feedback.

---

# 16. Admin Dashboard

V1 includes a basic administrator dashboard.

Access is restricted to authorized administrators.

## 16.1 User Management

Administrators can:
- View users.
- Review account information.
- Suspend accounts.
- Reinstate suspended accounts.

## 16.2 Destination Management

Administrators can:
- Add destinations.
- Edit destinations.
- Activate destinations.
- Deactivate destinations.
- Review missing-destination requests.

## 16.3 Pool Management

Administrators can:
- View pool information.
- Review pool status.
- Access information needed for support and moderation.

## 16.4 Report Management

Administrators can:
- View submitted reports.
- Review report details.
- Mark reports as reviewed.
- Resolve reports.
- Take appropriate moderation action.

## 16.5 Feedback Management

Administrators can review submitted user feedback.

---

# 17. Localization

V1 supports:
- English.
- Hindi.

The application architecture should allow additional languages to be added later without major redesign.

Marathi may be considered for a future release.

---

# 18. Non-Functional Requirements

## 18.1 Security

- Authentication and authorization must be enforced by the backend.
- Phone verification is mandatory.
- Sensitive user information must not be exposed unnecessarily.
- Women-only pool eligibility must be checked server-side.
- Blocking rules must be enforced server-side.
- Admin routes and actions must require administrator authorization.
- Account suspension must invalidate active sessions.
- Pool membership and capacity rules must not rely solely on frontend validation.

## 18.2 Data Integrity

- Pool capacity must never exceed three active passengers.
- A user must not participate in multiple active pools.
- A user must not have multiple active membership records for the same pool.
- Pool status transitions must be controlled by backend logic.
- Concurrent joining requests must be handled safely.
- Important pool activities must be recorded for audit and support.

## 18.3 Performance and Reliability

- Pool discovery should return relevant results efficiently.
- Pool joining should be reliable under concurrent requests.
- Background jobs must handle pool expiry and scheduled notifications.
- Notification failures should not corrupt pool state.
- The backend must remain stateless across application instances.

## 18.4 Privacy

- Do not collect continuous location data.
- Do not expose the full member list before joining.
- Do not expose unnecessary personal information.
- Provide account deletion functionality with an appropriate retention policy.

---

# 19. V1 Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js + Express.js + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Frontend deployment | Vercel |
| Backend deployment | Render |
| Containerization | Docker + Docker Compose |
| Version control | Git + GitHub |

The backend owns business rules, pool lifecycle transitions, authentication checks and database operations.

A separate background worker process will handle pool expiry and scheduled notifications using the same backend codebase and database.

---

# 20. Explicit V1 Exclusions

The following features are not part of the V1 release:

1. Driver registration or accounts.
2. Driver booking or integration.
3. Fare calculation or fare splitting.
4. Online payments.
5. In-app chat.
6. Live GPS tracking.
7. Journey completion tracking.
8. SOS functionality.
9. Government ID verification.
10. User ratings and public reviews.
11. Waiting lists for full pools.
12. Multiple pickup points per pool.
13. Favourite pickup points.
14. Ownership transfer.
15. Arbitrary user-created destinations.
16. Guest browsing.
17. Completed pool status.
18. Automated driver allocation.

These features may be evaluated for future versions.

---

# 21. Important Acceptance Criteria

The V1 release should not be considered functionally ready until the following are verified.

## Authentication and Profiles
- Users cannot access pool features without authentication.
- Phone OTP verification is mandatory.
- All mandatory profile fields are validated.
- Suspended accounts cannot access the application.
- Phone number changes require OTP verification.

## Pool Creation
- Eligible users can create immediate and scheduled pools.
- Immediate joining duration supports 1–15 minutes.
- Default immediate duration is 5 minutes.
- Pool capacity cannot exceed three passengers.
- Pickup and destination are selected from valid supported locations.
- Similar-pool warnings do not prevent creation.

## Pool Joining
- Eligible users can join open pools.
- Invalid or ineligible users cannot join.
- Concurrent joining cannot exceed capacity.
- A user cannot join multiple active pools.
- Women-only restrictions are enforced server-side.

## Pool Lifecycle
- Pools automatically become ready or expired at the joining deadline.
- Creators can mark eligible pools ready early.
- Creators can cancel open and ready pools.
- Creator leaving an open pool cancels the pool.
- Ready pools automatically expire after 30 minutes.
- Members cannot leave ready pools through the normal leave action.

## Discovery
- Matching pools appear automatically.
- Users can manually modify search filters.
- Destination matching uses exact destination IDs.
- Blocked users cannot discover each other's pools.
- Only eligible users can discover women-only pools.

## Notifications
- Join and leave events generate notifications.
- Ready, expired and cancelled events generate notifications.
- Scheduled departure reminders are sent at 10 and 5 minutes.
- Reminders are cancelled when no longer applicable.

## Safety and Administration
- Users can report users and pools.
- Users can block other users.
- Reports are visible to administrators.
- Only authorized administrators can manage users, destinations, pools and reports.

---

# 22. Open Items Requiring Technical or Policy Decisions

The product requirements are substantially defined, but these implementation details must be finalized before production:

1. Exact geographic boundary for the launch area.
2. OTP/SMS provider and delivery-failure handling.
3. Image storage provider and image-size limits.
4. Push notification provider and device-token lifecycle.
5. Exact personal-data retention period after account deletion.
6. Time-zone handling and scheduled-job reliability.
7. Whether administrative actions can cancel a ready pool and the exact audit procedure.
8. Exact pickup-proximity radius and departure-time matching tolerance.
9. Whether users can create a new pool immediately after their previous pool becomes ready or only after it expires/cancels.
10. Whether ready-pool cancellation by the creator requires a reason.

These items should be resolved in the relevant business-rules, database-design and architecture documents.

---

# 23. Future Direction

After validating the local MVP, possible future directions include:

- Expanding to additional residential areas.
- More language support, including Marathi.
- Improved identity verification.
- More advanced matching.
- Saved pickup points.
- Additional safety features.
- Organization-based deployments for colleges, offices and residential societies.
- A possible B2B subscription model.

Future features must be prioritized based on actual pilot usage and user feedback.

---

# 24. Document Approval

**Document:** ShareKar Product Requirements Document  
**Version:** 1.0  
**Status:** Draft — awaiting user review

Approval confirms that the product requirements are accepted as the baseline for V1 development. Open technical and policy items remain subject to resolution before the relevant implementation work.

**Approved by:** ____________________

**Approval date:** ____________________
