# Roadmap: 22 weekly sprints

Plan assumptions: 2.5 hours a day (8:00 to 10:30 PM IST), every day, about 17.5 hours a week.
Sprint 1 starts **Monday 9 Nov 2026**. Each sprint runs Monday to Sunday. Sunday evening is review and planning for the next week.
Tasks for sprints 1 to 5 are broken into subtasks now. Later sprints get subtasks when they come up (just-in-time planning), because the earlier work will change them.
Every sprint is refined against `docs/03-bussiness-rules.md`, `docs/04-database-design.md` and `docs/06-api-specification.md` before it starts.

**Milestones:** Closed beta in week 11 (18 Jan 2027). Public launch in week 22 (5 to 11 Apr 2027).

## Epics

| Key | Epic |
|---|---|
| E1 | Backend Foundation & Database |
| E2 | Authentication & Session Security |
| E3 | User Profiles & Account Lifecycle |
| E4 | Destination Management |
| E5 | Pool Management & Membership |
| E6 | Notifications, Safety & Supporting Modules |
| E7 | Frontend Application |
| E8 | Integration, QA & Deployment |
| E9 | Launch & Marketing |

## Sprint 0: Foundation and auth (DONE, before 9 Nov 2026)

E1: initialise backend and TypeScript structure, local PostgreSQL with Docker Compose, Prisma and DB connectivity, initial schema and migrations, health and readiness endpoints.
E2: email OTP login, rotating refresh tokens with reuse detection, instant revocation, rate limits, atomic OTP issuing (advisory lock), DB integration test suite, edge-case tests, error-handler fix (413 and 400).

## Sprint plan

| # | Dates | Epic | Goal |
|---|---|---|---|
| 1 | 9 to 15 Nov | E3 | Profile completion, account lifecycle, phone verification decision |
| 2 | 16 to 22 Nov | E4 | Destinations module |
| 3 | 23 to 29 Nov | E5 | Create pool, list and filter pools, pool detail |
| 4 | 30 Nov to 6 Dec | E5 | Join and leave pool (transactions, one-active-pool rule) |
| 5 | 7 to 13 Dec | E5 | Cancel, extend, expiry, pool events |
| 6 | 14 to 20 Dec | E7 | Frontend setup and auth screens |
| 7 | 21 to 27 Dec | E7 | Profile completion, destinations, pool list and detail screens |
| 8 | 28 Dec to 3 Jan | E7 | Create, join, leave, cancel, extend screens |
| 9 | 4 to 10 Jan | E6 | In-app notifications and departure reminders |
| 10 | 11 to 17 Jan | E8 | Beta deployment (hosting, HTTPS, real email provider), core QA |
| 11 | 18 to 24 Jan | E9 | **Closed beta** with 20 to 30 neighbors |
| 12 | 25 to 31 Jan | E5 | Beta fixes and invitations |
| 13 | 1 to 7 Feb | E6 | Blocks and reports (backend) |
| 14 | 8 to 14 Feb | E6 | Safety screens, feedback, destination requests |
| 15 | 15 to 21 Feb | E6 | Push notifications (Firebase) |
| 16 | 22 to 28 Feb | E6 | Admin module (moderation, suspend, destinations) |
| 17 | 1 to 7 Mar | E7 | Admin screens, logging and analytics |
| 18 | 8 to 14 Mar | E8 | Hardening: security review, performance, accessibility |
| 19 | 15 to 21 Mar | E8 | End-to-end tests (Playwright) and CI pipeline |
| 20 | 22 to 28 Mar | E8 | Production finalisation: backups, monitoring, domain, privacy policy and terms |
| 21 | 29 Mar to 4 Apr | E9 | Pre-launch marketing and soft launch to about 100 users |
| 22 | 5 to 11 Apr | E9 | **Public launch** in NL Complex, post-launch monitoring |

## Sprint 1 (9 to 15 Nov): User profiles and account lifecycle (E3)

1. **Profile completion API (`PATCH /users/me`)**
   - Re-read the profile rules in docs 03 and 06
   - Zod schema: phone in international format, gender, image URL
   - Service and repository update that sets `profileCompletedAt`
   - Wire `requireProfileComplete` to protected routes
   - Unit and DB tests, including "cannot change gender with an active pool"
2. **Read current user (`GET /users/me`) and field privacy**
   - Decide which fields are private vs public to other riders
   - Implement response shape
   - Tests
3. **Account lifecycle: deactivate and delete**
   - Check `deletedAt` and `accountStatus` handling in the schema
   - Endpoint plus soft delete
   - Revoke all sessions on delete (reuse `revokeAllForUser`)
   - Tests, log the decision
4. **Decision: phone verification for V1**
   - Docs require SMS OTP phone verification, but auth today is email OTP only
   - Compare SMS options for India (cost, DLT registration) against skipping phone verification in V1
   - Record the decision in `decisions.md` and update the docs

## Sprint 2 (16 to 22 Nov): Destinations (E4)

1. **List and search destinations API** (active only, name search, pagination)
   - Schema review, repository, service, route, validation
   - Tests
2. **Seed destinations for NL Complex area**
   - Collect real destinations (stations, offices, colleges)
   - Idempotent seed script
   - Document how to run it
3. **Admin add, edit, activate, deactivate destination**
   - Admin guard (placeholder role check until the admin module)
   - Endpoints and validation
   - Rule: inactive destination cannot be used for pools
4. **Destination tests**: DB tests for the active/inactive rule and unique names

## Sprint 3 (23 to 29 Nov): Create pool, list, detail (E5)

1. **Create pool API**
   - Validate: 1 to 3 capacity including creator, future time, joining deadline, active destination
   - Pickup address plus latitude and longitude
   - Women-only pool only for female creators
   - One-active-pool rule enforced in a transaction
2. **List and filter pools**
   - Filter by destination, time window, pickup radius (default 1 km straight-line), women-only eligibility
   - Pagination and sort
3. **Pool detail API**
   - Members, status, what a non-member may see
4. **Tests**: DB tests for create (one-active-pool race with two parallel creates)

## Sprint 4 (30 Nov to 6 Dec): Join and leave (E5)

1. **Join pool transaction**
   - Lock the pool row, check capacity, status, joining deadline, women-only eligibility
   - Enforce one-active-pool and block list
   - Lock the pickup when the first passenger joins
2. **Leave pool**
   - Passenger leave rules, creator leave rules
   - Status updates and re-opening a seat
3. **Concurrency tests**
   - Three people racing for the last seat: exactly one wins
   - Same user joining two pools at once: exactly one succeeds
4. **Pool events log** for join and leave

## Sprint 5 (7 to 13 Dec): Cancel, extend, expiry (E5)

1. **Cancel pool** (creator only, member effects, events)
2. **Extend pool** (rules for how far and how often)
3. **Auto-expire job** using the in-process scheduler (`backend/src/jobs`)
4. **Tests and API-spec check**: compare all pool endpoints against doc 06, update docs and `architecture-updates.md`

## Later sprints (tasks only; subtasks added at the start of each sprint)

- **6 Frontend setup and auth screens:** Vite, React, Tailwind, router, API client with safe token refresh, login/register/OTP screens
- **7 Profile and discovery screens:** profile completion, destination picker, pool list with filters, pool detail
- **8 Pool flow screens:** create pool with map/address pickup, join, leave, cancel, extend, error and empty states
- **9 Notifications:** in-app notification feed (backend and UI), departure reminder job, triggers on join/leave/cancel
- **10 Beta deployment:** pick hosting, production Postgres, domain and HTTPS, Resend or Brevo for email, environment secrets, smoke test
- **11 Closed beta:** onboard 20 to 30 neighbors, feedback form, bug triage
- **12 Beta fixes and invitations:** fix top beta issues, invitation links to a pool
- **13 Blocks and reports:** block a user, report a user or pool, effects on discovery
- **14 Safety screens, feedback, destination requests:** UI for the above
- **15 Push notifications:** Firebase Cloud Messaging, subscriptions, web push on key events
- **16 Admin module:** roles, review reports, suspend users (revokes sessions), manage destinations and destination requests
- **17 Admin screens, logging and analytics:** minimal admin UI, structured logging, basic usage numbers
- **18 Hardening:** security review, rate-limit review, performance, accessibility pass
- **19 E2E tests and CI:** Playwright happy paths, CI to run typecheck, tests and DB tests
- **20 Production finalisation:** backups and restore test, monitoring and alerts, privacy policy, terms, data deletion path
- **21 Pre-launch marketing:** posters and QR codes, society WhatsApp groups, waitlist, soft launch to about 100 users
- **22 Public launch:** launch announcement, watch errors and sign-ups, quick-fix window
