# MedicineLink – Backend PRD

Version 1.0 · Companion to the main PRD and the Database PRD · Written so Google Antigravity can build the API

## 1. Purpose and Scope

This document describes the server side of MedicineLink: the REST API, business rules, state machine, OCR, matching engine, background jobs, security and testing. The database tables are defined in the **Database PRD**.

**Prototype notice:** this backend is for a class project and must run only with dummy data. It must not be used to handle real medicines or real patient data.

### Goals

- A clean, well-documented REST API that the React front end can use.
- All business rules (eligibility, review, matching, status changes) enforced on the server, never only in the UI.
- Every important action recorded in an audit log.
- Easy to run locally with one command and seed data.

### Non-goals

- Microservices, message queues, real payments, real SMS or email delivery (stubs only), live GPS tracking.

## 2. Architecture

| Part | Choice | Notes |
| --- | --- | --- |
| Runtime | Node.js 20+ |  |
| Framework | Express | Simple and well known |
| Language | TypeScript (preferred) or JavaScript | TypeScript helps the AI agent avoid mistakes |
| Database | SQLite via better-sqlite3 (MVP) | Same SQL works on PostgreSQL later; see Database PRD |
| Validation | Zod | Validate every request body, query and param |
| Auth | JWT access token plus refresh token, bcrypt for passwords |  |
| File upload | Multer, images only | Stored in /uploads for MVP |
| OCR | Tesseract.js with sharp for image clean-up | Fallback to manual entry |
| Jobs | node-cron | Expiry check, match expiry, cleanup |
| Logging | pino | JSON logs with request id |
| Testing | Vitest or Jest with Supertest |  |
| API docs | OpenAPI (swagger-ui-express) | Served at /api/docs |

**Layers:** routes → controllers → services (business logic) → repositories (SQL). Controllers stay thin. All rules live in services so they are easy to test.

### Folder structure

```
backend/
  src/
    app.ts                 # express setup, middleware
    server.ts              # start server, cron
    config/                # env, constants, settings loader
    db/                    # connection, migrate.ts, seed.ts
    middleware/            # auth, rbac, validate, error, rateLimit, upload
    modules/
      auth/                # routes, controller, service, schema
      users/
      organizations/
      donations/           # donations + items
      ocr/
      eligibility/         # rules engine
      review/
      needs/
      matching/
      pickups/
      notifications/
      dashboard/
      audit/
    jobs/                  # expiryJob, matchExpiryJob, cleanupJob
    utils/                 # haversine, dates, ids, errors
  db/migrations/           # 001_init.sql ...
  tests/
  uploads/
  .env.example
```

## 3. Conventions

- Base path: **/api/v1**. JSON only. Dates in ISO 8601 UTC. IDs are UUID strings.
- Success response: { "success": true, "data": ... }
- Error response: { "success": false, "error": { "code": "ITEM\_EXPIRED", "message": "Plain English message", "details": \[...\] } }
- Pagination: ?page=1&limit=20, response includes total and page info. Sorting with ?sort=created\_at:desc.
- Every request gets a request id (header X-Request-Id) that appears in logs.

### Error codes

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | VALIDATION\_ERROR | Body, query or params are invalid |
| 401 | UNAUTHENTICATED | Missing or invalid token |
| 403 | FORBIDDEN | Role or ownership not allowed |
| 404 | NOT\_FOUND | Record does not exist |
| 409 | INVALID\_STATE | Action not allowed from current status |
| 409 | DUPLICATE | Email or batch already exists |
| 413 | FILE\_TOO\_LARGE | Photo over limit |
| 415 | UNSUPPORTED\_FILE | Not a JPG, PNG or WebP image |
| 422 | NOT\_ELIGIBLE | Item fails a hard eligibility rule |
| 429 | RATE\_LIMITED | Too many requests |
| 500 | INTERNAL\_ERROR | Unexpected error (details only in logs) |

## 4. Authentication and Authorisation

- **Sign-up:** donors register freely. NGO, clinic and pharmacy users register together with an organisation record that stays unverified until an admin approves it. Admin accounts come from the seed script only.
- **Passwords:** minimum 8 characters, hashed with bcrypt (cost 10 or more).
- **Tokens:** access token valid 15 minutes, refresh token valid 7 days stored in an httpOnly cookie, with rotation. For the simplest MVP a single 1-day JWT is acceptable.
- **RBAC middleware:** requireRole(...roles) on each route, plus **ownership checks** in services (a donor can only see their own donations; an NGO user only their own organisation's needs and matches).
- **Unverified organisations** cannot post needs, receive matches or review items.

### Access matrix

| Capability | Donor | Pharmacist | NGO or Clinic | Admin |
| --- | --- | --- | --- | --- |
| Create and view own donations | Yes | No | No | View all |
| Run OCR on a photo | Yes | Yes | No | Yes |
| Review queue and decisions | No | Yes (verified pharmacy) | No | View |
| Post needs | No | No | Yes (verified) | View |
| See and respond to matches | No | No | Yes (own) | View |
| Schedule pickup | No | Yes | Yes | Yes |
| Confirm received | No | No | Yes (own) | Yes |
| Verify organisations | No | No | No | Yes |
| Dashboard | Own summary | Own summary | Own summary | Full |
| Audit log | No | No | No | Yes |
| Settings | No | No | No | Yes |

## 5. Item Status Machine

Every donation item has one status. Only the transitions below are allowed. Anything else returns 409 INVALID\_STATE. Every transition runs inside a database transaction and writes an audit\_log row.

| From | To | Who or what triggers it | Side effects |
| --- | --- | --- | --- |
| (new) | LISTED | Donor creates item | Run eligibility rules |
| LISTED | AUTO\_BLOCKED | Hard rule fails | Reason stored; notify donor |
| LISTED | PENDING\_REVIEW | All hard rules pass | Notify pharmacists |
| PENDING\_REVIEW | APPROVED | Pharmacist | Create verification code; notify donor; run matching |
| PENDING\_REVIEW | REJECTED | Pharmacist | Reason stored; notify donor |
| APPROVED | MATCHED | Matching engine finds suggestions | Create match rows; notify NGOs |
| MATCHED | APPROVED | All suggestions declined or expired | Back to waiting pool |
| MATCHED | ACCEPTED | NGO accepts a match | Other suggestions for the item are cancelled; need quantity reduced |
| ACCEPTED | PICKUP\_SCHEDULED | Pickup created | Notify donor and NGO |
| PICKUP\_SCHEDULED | PICKED\_UP | Admin, NGO or pharmacist |  |
| PICKED\_UP | DELIVERED | Admin, NGO or pharmacist |  |
| DELIVERED | RECEIVED | NGO confirms | Completes match; updates dashboard numbers |
| LISTED, PENDING\_REVIEW, APPROVED, MATCHED | CANCELLED | Donor (before acceptance) | Cancel open matches |
| APPROVED, MATCHED | EXPIRED | Daily expiry job | Cancel open matches; notify donor |

A donation's own status is derived: open while any item is active, completed when all items reached a final status (RECEIVED, REJECTED, AUTO\_BLOCKED, CANCELLED, EXPIRED).

## 6. Eligibility Engine

A rule is a small function that returns { rule, passed, severity, message }. Severity is hard (blocks) or soft (flags for the pharmacist). Rules run in this order and **all results are stored** in donation\_items.auto\_check\_result as JSON.

| Rule | Severity | Logic |
| --- | --- | --- |
| MIN\_SHELF\_LIFE | Hard | Expiry date must be at least min\_shelf\_life\_months (setting, default 6) from today |
| NOT\_EXPIRED | Hard | Expiry date must be in the future |
| SEALED\_DECLARED | Hard | Donor declared sealed and unopened |
| ROOM\_TEMP\_DECLARED | Hard | Donor declared room-temperature storage |
| FORM\_ALLOWED | Hard | Form is not injectable, cold-chain or similar |
| NOT\_BLOCKED | Hard | Medicine name or generic name does not match blocked\_medicines (controlled, injectable, cold-chain) |
| BATCH\_PRESENT | Hard | Batch number provided |
| EXPIRY\_PRESENT | Hard | Expiry date provided and valid |
| LOW\_OCR\_CONFIDENCE | Soft | OCR confidence below 0.6 |
| RX\_ONLY | Soft | Prescription-only medicine |
| DUPLICATE\_BATCH | Soft | Same batch number and medicine already listed |
| QUANTITY\_UNUSUAL | Soft | Quantity above a sensible limit (for example 100) |

Medicine name matching: lowercase, trim, remove punctuation, check medicine\_aliases to get the generic name, then compare against blocked keywords with a "contains" check.

The rule set must be easy to extend: one file per rule, and a registry that lists them.

## 7. OCR Service

- **Endpoint:** POST /api/v1/items/ocr (multipart, field name photo). Can be called before the item exists, so the donor sees suggestions while filling the form.
- **Steps:** validate file type and size → sharp: auto-rotate, resize to max 1600px, grayscale, increase contrast → Tesseract.js recognise → extract fields with regular expressions → return suggestions.
- **Expiry patterns:** EXP, Exp Date, Expiry, Use before, with formats MM/YYYY, MM/YY, MM-YYYY, MMM YYYY, DD/MM/YYYY. Convert to YYYY-MM-DD using the last day of the month when no day is given.
- **Batch patterns:** B.No, Batch No, Batch, Lot, followed by letters and digits.
- **Response:** { expiry\_date, batch\_no, medicine\_name\_guess, raw\_text, confidence, fields\_found: \[...\] }. Confidence is the mean word confidence from Tesseract divided by 100.
- **Timeout:** 15 seconds. On timeout or failure return success with empty suggestions and a message, so the donor can type values manually.
- **Privacy:** photos are used only for this purpose, are stored under random file names, and are deleted after 90 days (cleanup job).
- Keep the OCR code behind an interface (OcrProvider) so a vision AI service can replace it later.

## 8. Matching Engine

Runs when an item becomes APPROVED, when a new need is created, and when a match is declined or expires.

**Step 1 – candidates:** open needs from verified organisations where the need's generic name equals the item's generic name (using aliases). Same strength scores higher.

**Step 2 – score (0 to 100):**

- Medicine match (max 50): same generic name and same strength = 50; same generic name, different strength = 20; otherwise excluded.
- Distance (max 30): using the Haversine formula between donor pickup location and organisation. 0 to 3 km = 30, 3 to 10 km = 22, 10 to 25 km = 12, above max\_distance\_km = excluded.
- Urgency (max 20): high 20, medium 12, low 5.

**Step 3 – suggestions:** take the top 3 scoring needs, create match rows with status suggested, quantity\_allocated = min(item quantity, need quantity\_remaining) and expires\_at = now + match\_expiry\_hours (default 48). Store score\_breakdown as JSON so the UI can explain it.

**Step 4 – response handling:** on Accept, run a transaction: set the match accepted, cancel the item's other suggestions, reduce need.quantity\_remaining, update need status, set item ACCEPTED. On Decline, mark declined and re-run matching excluding that organisation.

Because the same item can be suggested to several organisations at once, the **first accept wins**; the database has a unique constraint so two accepts cannot both succeed.

## 9. API Specification

All paths are under /api/v1. "Body" lists the main fields; every field is validated with Zod.

### Auth and users

| Method and path | Roles | Body or query | Result |
| --- | --- | --- | --- |
| POST /auth/register | Public | name, email, password, role (donor, pharmacist, ngo), phone, city; for non-donors also organisation: name, type, license\_no, address, lat, lng | Created user, tokens |
| POST /auth/login | Public | email, password | User and tokens |
| POST /auth/refresh | Public | refresh cookie | New access token |
| POST /auth/logout | Any |  | Clears refresh token |
| GET /me | Any |  | Profile and organisation |
| PATCH /me | Any | name, phone, city | Updated profile |

### Donations and items

| Method and path | Roles | Body or query | Result |
| --- | --- | --- | --- |
| POST /items/ocr | Donor, Pharmacist | photo (file) | OCR suggestions |
| POST /donations | Donor | pickup\_address, lat, lng, pickup\_window\_start, pickup\_window\_end, declaration\_sealed, declaration\_room\_temp, items: \[{ medicine\_name, strength, form, quantity, batch\_no, expiry\_date, is\_rx\_only, photo\_ids }\] | Donation with items and auto-check results |
| POST /donations/:id/photos | Donor | photo (file), item\_id | Photo record |
| GET /donations | Donor | status, page, limit | Own donations; Admin sees all |
| GET /donations/:id | Donor, Admin |  | Donation with items, timeline and matches |
| PATCH /items/:id | Donor | editable fields (only while LISTED or PENDING\_REVIEW) | Updated item, rules re-run |
| POST /items/:id/cancel | Donor |  | Item CANCELLED |

### Review

| Method and path | Roles | Body or query | Result |
| --- | --- | --- | --- |
| GET /review/queue | Pharmacist | page, limit | Items in PENDING\_REVIEW, oldest first, with photos and auto-check results |
| GET /review/items/:id | Pharmacist |  | Full item detail |
| POST /review/items/:id/decision | Pharmacist | decision (approve or reject), reject\_reason\_code, note | Updated item; verification code on approval |
| GET /review/history | Pharmacist | page, limit | Own past decisions |

Reject reason codes: EXPIRY\_UNREADABLE, BATCH\_UNREADABLE, DAMAGED\_PACK, OPENED\_PACK, NOT\_ALLOWED\_TYPE, SUSPECTED\_TAMPERING, SHORT\_SHELF\_LIFE, OTHER.

### Needs and matches

| Method and path | Roles | Body or query | Result |
| --- | --- | --- | --- |
| POST /needs | NGO or Clinic | medicine\_name, strength, quantity\_needed, urgency | Need; triggers matching |
| GET /needs | NGO or Clinic, Admin | status | Own needs (all for admin) |
| PATCH /needs/:id | NGO or Clinic | quantity\_needed, urgency, status (cancel) | Updated need |
| GET /matches | NGO or Clinic | status | Match suggestions with score breakdown and item details |
| POST /matches/:id/respond | NGO or Clinic | response (accept or decline) | Updated match and item |

### Pickups and completion

| Method and path | Roles | Body or query | Result |
| --- | --- | --- | --- |
| POST /pickups | Admin, NGO, Pharmacist | match\_id, volunteer\_name, volunteer\_phone, scheduled\_at | Pickup; item PICKUP\_SCHEDULED |
| PATCH /pickups/:id | Admin, NGO, Pharmacist | status (picked\_up, delivered, failed), notes | Updated pickup and item |
| POST /pickups/:id/confirm-received | NGO or Clinic | notes | Item RECEIVED, match completed |
| GET /pickups | NGO, Admin, Pharmacist | status | Pickup list |

### Notifications, dashboard, admin

| Method and path | Roles | Result |
| --- | --- | --- |
| GET /notifications | Any | Own notifications, newest first |
| POST /notifications/read | Any | Marks ids as read |
| GET /dashboard/stats | Any | Role-specific numbers; admin gets everything |
| GET /dashboard/timeseries?metric=items&period=8w | Admin | Weekly counts for charts |
| GET /admin/organizations?verified=false | Admin | Organisation list |
| POST /admin/organizations/:id/verify | Admin | Verified true or false with note |
| GET /admin/audit | Admin | Filter by actor, entity, date |
| GET and PATCH /admin/settings | Admin | Read and change settings |
| GET /health | Public | Service health |

## 10. Background Jobs

| Job | Schedule | What it does |
| --- | --- | --- |
| Expiry check | Daily at 00:30 | Items in APPROVED or MATCHED whose remaining shelf life is below the minimum become EXPIRED; open matches cancelled; donor notified |
| Match expiry | Every hour | Suggested matches past expires\_at become expired; item returns to APPROVED and matching re-runs |
| Stale review reminder | Daily | Notify pharmacists if items wait more than 48 hours |
| Cleanup | Weekly | Delete photos older than 90 days and files with no database record |

Jobs must be safe to run twice (idempotent) and must log how many records they changed.

## 11. Notifications

In-app notifications are stored in the notifications table. Email and SMS are **stubs** that write to the log, behind a NotificationChannel interface so real providers can be added later.

Events: item auto-blocked, item sent for review, item approved, item rejected, new match, match accepted, pickup scheduled, picked up, delivered, received, item expired, organisation verified.

## 12. Audit Log

Write one audit row for every status change, review decision, organisation verification, setting change and login failure. Fields: actor, role, action, entity, entity id, details JSON, time. The table is append-only (see Database PRD).

## 13. Security Requirements

- helmet for headers, CORS limited to the front-end origin, JSON body limit of 1 MB.
- Rate limit: 100 requests per minute per IP overall, 10 per minute on login and register.
- Use parameterised SQL only. Never build queries by joining strings.
- Upload checks: allow only JPEG, PNG and WebP by checking file signature, maximum 5 MB, random file names, never trust the original name.
- Passwords and tokens never appear in logs. Secrets live in .env, and .env is in .gitignore.
- Do not return password hashes or internal error details.
- Prevent privilege escalation: role cannot be changed through the public API.
- Every query for user data filters by owner or role.

## 14. Non-Functional Requirements

- p95 response under 300 ms for non-OCR endpoints on a normal laptop.
- OCR under 10 seconds for a 1600px photo.
- Start the whole backend with: npm run db:migrate, npm run db:seed, npm run dev.
- Environment config only through environment variables.
- Test coverage of at least 80 percent for services; every eligibility rule, the state machine and the matching score have tests.
- Clear README with setup, scripts and a Postman or Thunder Client collection (or the OpenAPI page).

### Environment variables (.env.example)

```
PORT=4000
NODE_ENV=development
DATABASE_PATH=./data/medicinelink.db
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGIN=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=5
OCR_TIMEOUT_MS=15000
```

## 15. Test Plan

1. **Eligibility:** 15 sample cases (see Database PRD seed section) must produce the expected block or approve result.
2. **State machine:** every allowed transition works; every disallowed transition returns 409.
3. **Matching:** correct score for medicine, distance and urgency combinations; first accept wins; declined organisations are not suggested again.
4. **Auth and RBAC:** every endpoint tested for the wrong role and for another user's data.
5. **Jobs:** expiry and match expiry run twice with the same result.
6. **End-to-end:** donor lists, pharmacist approves, NGO accepts, pickup scheduled, delivered, received, and dashboard numbers match.
7. **OCR:** 10 sample photos; at least 7 give the correct expiry; failures fall back gracefully.

## 16. Build Phases

| Phase | Scope | Done when |
| --- | --- | --- |
| B1 Foundation | Project setup, config, migrations from the Database PRD, seed script, error handling, logging, health route | Server starts and /health works; database is created and seeded |
| B2 Auth | Register, login, refresh, RBAC middleware, organisation records, admin verification | Roles can log in and are limited correctly |
| B3 Donations and eligibility | Donation and item endpoints, photo upload, eligibility engine, OCR | Items are blocked or sent to review with stored results |
| B4 Review | Queue, decision, verification code, audit log, notifications | Pharmacist can approve and reject |
| B5 Needs and matching | Needs endpoints, matching engine, respond endpoint, match expiry job | NGO sees ranked matches and can accept |
| B6 Fulfilment and insights | Pickups, confirm received, expiry job, dashboard, settings, OpenAPI docs, tests | Full flow passes the end-to-end test |

## 17. Prompts for Google Antigravity

Put PRD.md, DATABASE\_PRD.md and BACKEND\_PRD.md in the project folder. Run these one at a time.

### Master prompt (phase B1 and B2)

```
Read PRD.md, DATABASE_PRD.md and BACKEND_PRD.md. We are building the backend
of MedicineLink, a class-project prototype that uses dummy data only.

Stack: Node.js 20, Express, TypeScript, better-sqlite3, Zod, bcrypt, JWT,
multer, sharp, tesseract.js, node-cron, pino, Vitest + Supertest.

First, show me a short plan and the folder structure from BACKEND_PRD.md
Section 2. After I approve, build Phases B1 and B2:
- Project setup, config from environment variables, .env.example
- SQL migrations exactly as defined in DATABASE_PRD.md and a seed script
- Layered structure: routes -> controllers -> services -> repositories
- Response envelope, error codes, validation middleware, request ids
- Auth (register, login, refresh, logout, /me), RBAC middleware, rate limits
- Admin organisation verification
- Tests for auth and RBAC
At the end, run migrations, seed, start the server, and show me example
curl commands to test it.
```

### Phase B3 prompt

```
Implement Phase B3 from BACKEND_PRD.md: donations and items endpoints,
photo upload with strict validation, the eligibility engine (one file per
rule, with a registry, all 12 rules in Section 6, settings read from the
settings table), and the OCR endpoint using sharp + tesseract.js behind an
OcrProvider interface with regex extraction for expiry and batch.
Store auto_check_result as JSON. Add tests for all 15 seed cases.
```

### Phase B4 prompt

```
Implement Phase B4: review queue, review detail, decision endpoint, status
machine transitions inside database transactions, verification code
generation, audit logging for every transition, and in-app notifications.
Invalid transitions must return 409 INVALID_STATE. Add tests.
```

### Phase B5 prompt

```
Implement Phase B5: needs endpoints and the matching engine exactly as in
Section 8 (candidate search, score with breakdown, top 3 suggestions, first
accept wins using the unique index, decline re-matching), plus the hourly
match expiry job. Add tests for scoring and concurrency.
```

### Phase B6 prompt

```
Implement Phase B6: pickups, confirm-received, the daily expiry job,
dashboard stats and timeseries endpoints, admin settings and audit
endpoints, OpenAPI docs at /api/docs, and an end-to-end test of the full
flow. Then write a README with setup steps and a demo walkthrough.
```

### Connect the front end

```
Check that every endpoint the React front end needs exists and matches
the response shapes. Enable CORS for http://localhost:5173, fix any
mismatch, and list the API calls the front end should replace its mock
data with.
```

## 18. Open Questions

- TypeScript or plain JavaScript?
- Single long-lived JWT for the demo, or access plus refresh tokens?
- Should donors be able to choose a specific partner pharmacy for drop-off in the MVP?
- Is a separate volunteer role needed, or is a typed volunteer name enough?
