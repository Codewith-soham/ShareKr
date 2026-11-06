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
