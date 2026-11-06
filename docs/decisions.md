# Decisions Log

A running record of the decisions made while building ShareKar, written in plain language.
Newest entries go at the **top**. Each entry says what we decided, why, and what it means for us later.

How to add an entry: copy the template, fill it in, put it under this line.

```
## YYYY-MM-DD: Short title
**Decision:** what we chose, in one or two sentences.
**Why:** the problem or reasoning behind it.
**Alternatives considered:** what we did not pick (optional).
**Consequences / watch out for:** what this means going forward.
```

---

## 2026-11-06: V1 uses email OTP only; no SMS phone verification
**Decision:** Users prove who they are with the email OTP. The phone number is typed by the user and shown to pool members, but it is not checked by SMS. SMS verification is planned for after launch.
**Why:** SMS in India needs DLT registration (days to weeks) and a per-message fee, which risks the April 2027 launch and the zero-cost policy. V1 users are neighbours in one housing complex, so the community is a natural safety check.
**Alternatives considered:** SMS OTP in V1 (cost, delay, extra provider code).
**Consequences / watch out for:** A user could type a wrong or someone else's number, so the join screen must say phone numbers are shared and the app should never imply they are verified. Phone stays locked once set until SMS arrives. Docs 03 (sections 3.1, 3.2, 9, 10) and 06 were updated to say email-verified instead of phone-verified. The `requireProfileComplete` gate (SHARE-96) is the only access check needed.

## 2026-11-06: The 2 MB photo limit is enforced by our server, not by Cloudinary
**Decision:** When the browser sends the photo link, the server asks Cloudinary for the stored file size (HEAD request). Over 2 MB gives 422 PROFILE_IMAGE_TOO_LARGE and the file is deleted. A link to an image that does not exist gives 422 INVALID_PROFILE_IMAGE. Deletes also ask Cloudinary to clear its CDN cache.
**Why:** A live test showed Cloudinary's upload API refuses max_file_size as a signed parameter, so the signature cannot enforce a size. Without the check, a user could save a huge file or a link to nothing. Without cache clearing, a deleted photo can still be served from the CDN for a while, which matters for account deletion.
**Alternatives considered:** A Cloudinary upload preset with a size cap (needs dashboard setup and was not confirmed for per-upload limits). Trusting the frontend (not safe).
**Consequences / watch out for:** Saving a profile photo now makes one extra request to Cloudinary; if Cloudinary is down the save answers 503 IMAGE_CHECK_UNAVAILABLE. The frontend should still check the size first (the signature response includes maxBytes) to give instant feedback.

## 2026-11-06: Pool members can see each other's phone number
**Decision:** Browsing riders see only "Soham K." and a photo. Active members of the same OPEN or READY pool also see the full name and phone number. Email, gender and account status are never shown to other users.
**Why:** V1 has no chat, so the phone is the only way riders can find each other at the pickup point. Docs 03 already hide full member details until joining.
**Alternatives considered:** Hiding phones and adding in-app chat (out of scope for V1). Showing phones to everyone (privacy risk).
**Consequences / watch out for:** The join confirmation screen must say the number will be shared. The pool module must only use the member view for active members of an OPEN or READY pool, and the preview view everywhere else (lists, search, after leaving, cancelled or closed pools). Blocking (Sprint 13) must also hide the phone. Docs 03 section 9 should be updated to say this.

## 2026-11-06: Profile images on Cloudinary; accounts deleted in two stages
**Decision:** Profile photos are stored on Cloudinary (free tier), uploaded straight from the browser with a signature from our server. We accept only image URLs from our own Cloudinary account and the user's own folder, max 2 MB, jpg/png/webp. Deleting an account deactivates it at once (sessions revoked, cannot log in); 30 days later a daily job wipes the personal data. Deletion is refused while the user is in an active pool.
**Why:** Cloudinary resizes and converts images for us and the docs already planned it; Cloudflare R2 is cheaper at scale but needs our own image code. The URL allow-list stops tracking pixels and other people's photos. Two-stage deletion follows docs 02 and 06 and keeps pool history valid.
**Alternatives considered:** Cloudflare R2 (revisit if we outgrow the free tier). Auto-cancelling pools on delete (waits for Sprints 4 and 5, so for now the user must leave or cancel first).
**Consequences / watch out for:** Needs 3 CLOUDINARY_* keys in .env (required in production). Retention is ACCOUNT_RETENTION_DAYS (default 30), still to be confirmed as the final legal number. Same email can register again only after the wipe. Phone is still not verified (see SHARE-18).

## 2026-11-06: Reuse the existing Jira SHARE project instead of deleting it
**Decision:** Jira project SHARE (board 36) keeps its 8 epics and its finished tasks, and gets a new "Launch & Marketing" epic (SHARE-14), 22 weekly sprints, 78 tasks and 68 subtasks. Sprint names are 29 characters or fewer because Jira rejects longer ones.
**Why:** The Jira connector cannot delete issues or sprints, and the user chose to reuse what existed.
**Consequences / watch out for:** Sprints 1 to 5 have subtasks now; later sprints get theirs at the start of each sprint. The old Done tasks (SHARE-9 to 13) were moved to the backlog so Sprint 1 starts clean. SHARE-161 to 164 record the finished auth work. Each sprint still has to be started in Jira when its week begins.

## 2026-11-06: 22 weekly sprints, 2.5 hours a day, launch around 5 to 11 Apr 2027
**Decision:** Work is planned as 22 one-week sprints starting Monday 9 Nov 2026. The full plan is in `docs/roadmap.md`. Google Calendar has a daily 8:00 to 10:30 PM IST block (154 days) plus one all-day banner per sprint. Closed beta is sprint 11 (18 Jan 2027) and public launch is sprint 22.
**Why:** The user can give 2 to 3 hours a day, every day. Weekly sprints match a week-by-week calendar and give fast feedback.
**Alternatives considered:** Two-week sprints (fewer to manage but bigger scope each). Daily calendar events with a specific task each (about 154 events, too heavy to keep in step with Jira).
**Consequences / watch out for:** Subtasks exist only for sprints 1 to 5 and get added at the start of each later sprint. Docs 03 requires SMS-verified phone numbers, but auth is email OTP only; sprint 1 must decide how phone verification works in V1. The Jira connector cannot delete issues, so old SHARE issues must be deleted by hand in Jira.

## 2026-11-06: Oversized or malformed request bodies return 413 / 400, not 500
**Decision:** The central error handler now recognises body-parser errors. A body over 10kb gives `413 PAYLOAD_TOO_LARGE`, and broken JSON gives `400 INVALID_JSON`.
**Why:** A live smoke test showed a 12kb body returned `500 Internal server error` and logged a scary stack trace. That is a client mistake, not a server fault, and 500s would hide real problems in monitoring.
**Consequences / watch out for:** Real unexpected errors still return a generic 500 with no details. The new cases are covered by `src/middleware/errorHandler.test.ts`.

## 2026-11-06: Serialize OTP issuing per email in the database
**Decision:** The cooldown check, the 5-per-hour cap and "invalidate the old code, create a new one" now run as one step inside a single database transaction, guarded by a per-email Postgres advisory lock (`issueChallenge` in `auth.repository.ts`).
**Why:** A real-database test showed that 8 simultaneous register requests for one email sent 8 emails and left 8 live codes. Each check passed independently, so parallel requests bypassed both the cooldown and the hourly cap. Unit tests could not catch this because the in-memory fake repo has no concurrency.
**Alternatives considered:** Rely on the IP rate limiter alone (it only bounds the damage, it does not stop it). A unique partial index on "one active challenge per email" (would work, but would not cover the cooldown/cap checks).
**Consequences / watch out for:** Requests for the *same* email now queue briefly. Different emails are unaffected. Any new code that issues OTPs must go through `issueChallenge`, not `replaceChallenge` directly.

## 2026-11-06: Add a separate database test suite (`npm run test:db`)
**Decision:** Added integration tests that run the real Prisma repository against a dedicated `sharekar_test` Postgres database. They live in `*.dbtest.ts` files so plain `npm test` stays database-free.
**Why:** The most security-critical auth guarantees (one-time OTP use, refresh-token rotation, token-reuse detection) are enforced by SQL, and the fake repo cannot prove them.
**Alternatives considered:** Skip DB tests for the MVP and check by hand with Postman and Prisma Studio.
**Consequences / watch out for:** Needs `docker compose up -d` and migrations applied to `sharekar_test`. The setup file refuses to run unless the database name ends in `_test`, because the tests truncate tables. Reuse this suite for the pool create/join/leave transactions.

## 2026-11-06: Keep rate limits on; relax only temporarily
**Decision:** Limits are 100 requests per 15 minutes for all `/auth/*`, and 10 per 15 minutes for the OTP routes. They were loosened once for Postman testing and then restored.
**Why:** OTP endpoints send email and accept code guesses, so they need a tight limit.
**Consequences / watch out for:** Heavy manual testing can hit 429. Restarting the server clears the in-memory counters.

## 2026-11-06: Use Gmail SMTP for development, a transactional provider for production
**Decision:** Local dev sends OTP emails through Gmail (smtp.gmail.com, port 587, app password). For production we plan to move to Resend, Brevo or similar.
**Why:** Gmail is the quickest to set up. The code uses a generic SMTP transport, so switching providers only changes `.env` values.
**Consequences / watch out for:** Gmail caps sending (about 500 a day) and is not suitable for real users. Before going live, verify the sending domain (SPF and DKIM) so OTP emails do not land in spam. `.env` holds secrets and must never be committed.

## 2026-11-05: Email OTP login with rotating refresh tokens
**Decision:** Users sign in with an emailed 6-digit code, no passwords. The server issues a short-lived access token plus a refresh token in an HttpOnly cookie. The refresh token rotates on every use.
**Why:** No passwords to leak or reset, and it fits the V1 scope.
**Consequences / watch out for:** OTPs are single-use, expire after 5 minutes and lock after 3 wrong tries. Using an old refresh token is treated as theft and revokes that whole session family, so two tabs refreshing at the same instant will log the user out. The frontend should avoid parallel refreshes.
