# MedicineLink – Database PRD

Version 1.0 · Companion to the main PRD and the Backend PRD · Written so Google Antigravity can create the database

## 1. Purpose

This document defines the data model for MedicineLink: tables, columns, rules, indexes, seed data, queries, migrations and privacy. The Backend PRD explains how the API uses these tables.

**Prototype notice:** the database must hold only dummy data. Do not store real medicines, real prescriptions or real patient information.

## 2. Technology and Conventions

| Topic | Decision |
| --- | --- |
| Database | **SQLite** (file database) through better-sqlite3 for the MVP. The SQL is written so it can move to PostgreSQL later (see Section 10). |
| Foreign keys | Always on. Run PRAGMA foreign\_keys = ON for every connection. |
| IDs | UUID strings (TEXT), created in the application with crypto.randomUUID(). The audit\_log uses an auto-increment integer. |
| Timestamps | ISO 8601 UTC text, for example 2026-10-25T10:30:00.000Z. Columns: created\_at, updated\_at. |
| Dates | Calendar dates as text YYYY-MM-DD (for example expiry\_date). |
| Booleans | INTEGER 0 or 1 with a CHECK. |
| JSON | Stored as TEXT. Always written and read through the application. |
| Names | snake\_case, plural table names, singular column names. |
| Enums | TEXT with CHECK constraints so invalid values cannot be saved. |
| Deleting | Avoid hard deletes. Use status values (cancelled, expired). Only expired refresh tokens, old notifications and old photos are cleaned up by jobs. |
| Migrations | Plain numbered SQL files in db/migrations. A small runner applies them in order and records them in a schema\_migrations table. |

## 3. Entity Relationships

| Relationship | Meaning |
| --- | --- |

| organizations 1 to many users | A staff member belongs to one organisation (NGO, clinic or pharmacy). Donors and admins have no organisation. | | users 1 to many donations | A donor creates donations. | | donations 1 to many donation\_items | One donation can contain several medicine packs. | | donation\_items 1 to many item\_photos | Each pack can have several photos. | | organizations 1 to many needs | A NGO or clinic posts needs. | | donation\_items many to many needs, through matches | A match links one item to one need and holds the score. | | matches 1 to 0 or 1 pickups | An accepted match gets a pickup. | | users 1 to many notifications | In-app messages. | | users 1 to many audit\_log rows | Who did what. | | medicine\_aliases and blocked\_medicines | Lookup lists used by the eligibility engine. | | settings | Key and value configuration changed by the admin. |

## 4. Table Definitions (SQL)

Run these in migration 001\_init.sql. Tables that point to each other (users and organizations) are allowed because SQLite checks foreign keys when data is written, not when tables are created.

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE organizations (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('ngo','clinic','pharmacy')),
  license_no        TEXT,
  verified          INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0,1)),
  verified_by       TEXT REFERENCES users(id),
  verified_at       TEXT,
  verification_note TEXT,
  address           TEXT,
  city              TEXT,
  lat               REAL CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  lng               REAL CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  contact_phone     TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('donor','pharmacist','ngo','admin')),
  phone         TEXT,
  city          TEXT,
  org_id        TEXT REFERENCES organizations(id),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (role IN ('donor','admin') OR org_id IS NOT NULL)
);

CREATE TABLE refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE donations (
  id                    TEXT PRIMARY KEY,
  donor_id              TEXT NOT NULL REFERENCES users(id),
  pickup_address        TEXT NOT NULL,
  lat                   REAL CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  lng                   REAL CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  pickup_window_start   TEXT,
  pickup_window_end     TEXT,
  drop_at_org_id        TEXT REFERENCES organizations(id),
  declaration_sealed    INTEGER NOT NULL DEFAULT 0 CHECK (declaration_sealed IN (0,1)),
  declaration_room_temp INTEGER NOT NULL DEFAULT 0 CHECK (declaration_room_temp IN (0,1)),
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled')),
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE donation_items (
  id                 TEXT PRIMARY KEY,
  donation_id        TEXT NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  medicine_name      TEXT NOT NULL,
  generic_name       TEXT,
  strength           TEXT,
  form               TEXT NOT NULL CHECK (form IN ('tablet','capsule','syrup','ointment','drops','inhaler','powder','other')),
  quantity           INTEGER NOT NULL CHECK (quantity > 0),
  batch_no           TEXT,
  expiry_date        TEXT CHECK (expiry_date IS NULL OR expiry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  est_value          REAL CHECK (est_value IS NULL OR est_value >= 0),
  is_rx_only         INTEGER NOT NULL DEFAULT 0 CHECK (is_rx_only IN (0,1)),
  status             TEXT NOT NULL DEFAULT 'LISTED' CHECK (status IN (
                       'LISTED','AUTO_BLOCKED','PENDING_REVIEW','APPROVED','REJECTED',
                       'MATCHED','ACCEPTED','PICKUP_SCHEDULED','PICKED_UP','DELIVERED',
                       'RECEIVED','CANCELLED','EXPIRED')),
  ocr_text           TEXT,
  ocr_confidence     REAL CHECK (ocr_confidence IS NULL OR ocr_confidence BETWEEN 0 AND 1),
  auto_check_result  TEXT,
  reviewer_id        TEXT REFERENCES users(id),
  reviewed_at        TEXT,
  reject_reason_code TEXT CHECK (reject_reason_code IS NULL OR reject_reason_code IN (
                       'EXPIRY_UNREADABLE','BATCH_UNREADABLE','DAMAGED_PACK','OPENED_PACK',
                       'NOT_ALLOWED_TYPE','SUSPECTED_TAMPERING','SHORT_SHELF_LIFE','OTHER')),
  reject_note        TEXT,
  verification_code  TEXT UNIQUE,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (status <> 'REJECTED' OR reject_reason_code IS NOT NULL)
);

CREATE TABLE item_photos (
  id         TEXT PRIMARY KEY,
  item_id    TEXT REFERENCES donation_items(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  file_path  TEXT NOT NULL,
  mime_type  TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE needs (
  id                 TEXT PRIMARY KEY,
  org_id             TEXT NOT NULL REFERENCES organizations(id),
  created_by         TEXT NOT NULL REFERENCES users(id),
  medicine_name      TEXT NOT NULL,
  generic_name       TEXT,
  strength           TEXT,
  quantity_needed    INTEGER NOT NULL CHECK (quantity_needed > 0),
  quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  urgency            TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low','medium','high')),
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','partially_fulfilled','fulfilled','cancelled')),
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (quantity_remaining <= quantity_needed)
);

CREATE TABLE matches (
  id                 TEXT PRIMARY KEY,
  item_id            TEXT NOT NULL REFERENCES donation_items(id),
  need_id            TEXT NOT NULL REFERENCES needs(id),
  org_id             TEXT NOT NULL REFERENCES organizations(id),
  score              INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  score_breakdown    TEXT NOT NULL,
  quantity_allocated INTEGER NOT NULL CHECK (quantity_allocated > 0),
  status             TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN (
                       'suggested','accepted','declined','expired','cancelled','completed')),
  expires_at         TEXT,
  responded_at       TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (item_id, need_id)
);

CREATE TABLE pickups (
  id               TEXT PRIMARY KEY,
  match_id         TEXT NOT NULL UNIQUE REFERENCES matches(id),
  volunteer_name   TEXT,
  volunteer_phone  TEXT,
  scheduled_at     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
                     'scheduled','picked_up','delivered','received','failed')),
  picked_up_at     TEXT,
  delivered_at     TEXT,
  received_at      TEXT,
  received_by      TEXT REFERENCES users(id),
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id   TEXT REFERENCES users(id),
  actor_role TEXT,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  details    TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE blocked_medicines (
  id       TEXT PRIMARY KEY,
  keyword  TEXT NOT NULL UNIQUE COLLATE NOCASE,
  category TEXT NOT NULL CHECK (category IN ('injectable','cold_chain','controlled','other')),
  reason   TEXT NOT NULL
);

CREATE TABLE medicine_aliases (
  id           TEXT PRIMARY KEY,
  alias        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  generic_name TEXT NOT NULL COLLATE NOCASE
);

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_by  TEXT REFERENCES users(id),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
```

## 5. Indexes, Triggers and Hard Rules

```sql
-- Lookups and lists
CREATE INDEX ix_users_org            ON users(org_id);
CREATE INDEX ix_refresh_user         ON refresh_tokens(user_id);
CREATE INDEX ix_donations_donor      ON donations(donor_id, created_at DESC);
CREATE INDEX ix_items_donation       ON donation_items(donation_id);
CREATE INDEX ix_items_status_created ON donation_items(status, created_at);
CREATE INDEX ix_items_expiry         ON donation_items(expiry_date) WHERE status IN ('APPROVED','MATCHED');
CREATE INDEX ix_items_batch          ON donation_items(batch_no, medicine_name COLLATE NOCASE);
CREATE INDEX ix_photos_item          ON item_photos(item_id);
CREATE INDEX ix_needs_open           ON needs(generic_name COLLATE NOCASE, urgency) WHERE status IN ('open','partially_fulfilled');
CREATE INDEX ix_needs_org            ON needs(org_id, status);
CREATE INDEX ix_matches_org_status   ON matches(org_id, status);
CREATE INDEX ix_matches_expiry       ON matches(expires_at) WHERE status = 'suggested';
CREATE INDEX ix_notif_user_unread    ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX ix_audit_entity         ON audit_log(entity, entity_id);
CREATE INDEX ix_audit_actor_time     ON audit_log(actor_id, created_at DESC);

-- First accept wins: only one accepted or completed match per item
CREATE UNIQUE INDEX ux_matches_one_accepted
  ON matches(item_id) WHERE status IN ('accepted','completed');

-- Audit log is append-only
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
```

### Rules the database enforces

| Rule | How |
| --- | --- |
| Only valid status and role values | CHECK constraints on every enum column |
| Quantity is always positive | CHECK on quantity, quantity\_needed, quantity\_allocated |
| A need can never promise more than it asked for | CHECK quantity\_remaining between 0 and quantity\_needed |
| A rejected item always has a reason | CHECK on donation\_items |
| Staff users always belong to an organisation | CHECK on users |
| One accepted match per item | Partial unique index ux\_matches\_one\_accepted |
| Same item and need cannot be matched twice | UNIQUE (item\_id, need\_id) |
| One pickup per match | UNIQUE match\_id on pickups |
| Audit history cannot be changed | Triggers |
| Dates are in the right format | GLOB check on expiry\_date |

### Rules the application enforces (in transactions)

- Status transitions follow the Backend PRD state machine; each one also inserts an audit\_log row in the same transaction.
- Accepting a match: update match, cancel the item's other suggestions, reduce need.quantity\_remaining, update need status, update item status, all or nothing.
- updated\_at is set by the application on every update.
- A donation's status is recalculated when any of its items reaches a final status.
- Only users of a verified organisation can post needs, receive matches or review items.

## 6. Status Reference

| Table | Values |
| --- | --- |
| donation\_items.status | LISTED, AUTO\_BLOCKED, PENDING\_REVIEW, APPROVED, REJECTED, MATCHED, ACCEPTED, PICKUP\_SCHEDULED, PICKED\_UP, DELIVERED, RECEIVED, CANCELLED, EXPIRED |
| matches.status | suggested, accepted, declined, expired, cancelled, completed |
| needs.status | open, partially\_fulfilled, fulfilled, cancelled |
| pickups.status | scheduled, picked\_up, delivered, received, failed |
| donations.status | open, completed, cancelled |

Final item statuses: RECEIVED, REJECTED, AUTO\_BLOCKED, CANCELLED, EXPIRED.

## 7. Default Settings and Lookup Data

### settings

| key | default | meaning |
| --- | --- | --- |
| min\_shelf\_life\_months | 6 | Minimum months before expiry |
| match\_expiry\_hours | 48 | How long a suggested match stays open |
| max\_distance\_km | 25 | Farthest distance for matching |
| max\_upload\_mb | 5 | Photo size limit |
| ocr\_low\_confidence | 0.6 | Below this, flag the item |
| quantity\_unusual\_limit | 100 | Above this, flag the item |
| photo\_retention\_days | 90 | When the cleanup job deletes photos |
| review\_reminder\_hours | 48 | When to remind pharmacists |

### blocked\_medicines (starter list, dummy)

| keyword | category | reason |
| --- | --- | --- |
| insulin | cold\_chain | Needs refrigeration |
| vaccine | cold\_chain | Needs refrigeration |
| injection | injectable | Injectables not accepted |
| tramadol | controlled | Controlled substance |
| morphine | controlled | Controlled substance |
| codeine | controlled | Controlled substance |
| alprazolam | controlled | Controlled substance |
| diazepam | controlled | Controlled substance |

### medicine\_aliases (starter list)

Examples: crocin, dolo, calpol to paracetamol; brufen, advil to ibuprofen; glycomet to metformin; zyrtec to cetirizine; azithral to azithromycin; mox to amoxicillin; pan, pantocid to pantoprazole; omez to omeprazole. About 20 rows are enough.

## 8. Seed Data Plan

The seed script must be safe to run twice (clear and re-insert, or skip existing rows). All passwords for demo accounts are Demo@1234 and exist only for local testing.

### Organisations and users

| Organisation | Type | Verified | Users |
| --- | --- | --- | --- |
| Asha Health Foundation | ngo | Yes | 1 NGO user |
| Care Street Clinic | clinic | Yes | 1 clinic user |
| GreenCross Pharmacy | pharmacy | Yes | 2 pharmacist users |
| Hope Helpers | ngo | **No** | 1 NGO user (to test the verification flow) |
| (none) |  |  | 1 admin, 2 donors |

Place all organisations and donors at different sample coordinates within one city so distance scoring can be tested.

### Fifteen eligibility test items

| # | Medicine and case | Expected result |
| --- | --- | --- |
| 1 | Paracetamol 500 mg tablet, 18 months left, sealed | PENDING\_REVIEW |
| 2 | Amoxicillin 500 mg capsule, 10 months left, prescription-only | PENDING\_REVIEW with RX\_ONLY flag |
| 3 | Metformin 500 mg tablet, 7 months left | PENDING\_REVIEW |
| 4 | Cetirizine 10 mg tablet, 5 months left | AUTO\_BLOCKED (MIN\_SHELF\_LIFE) |
| 5 | Azithromycin 500 mg tablet, expired 2 months ago | AUTO\_BLOCKED (NOT\_EXPIRED) |
| 6 | Insulin pen | AUTO\_BLOCKED (NOT\_BLOCKED, cold chain) |
| 7 | Ceftriaxone injection | AUTO\_BLOCKED (FORM\_ALLOWED) |
| 8 | Tramadol 50 mg tablet | AUTO\_BLOCKED (NOT\_BLOCKED, controlled) |
| 9 | Ibuprofen 400 mg, no batch number | AUTO\_BLOCKED (BATCH\_PRESENT) |
| 10 | Omeprazole 20 mg, no expiry date | AUTO\_BLOCKED (EXPIRY\_PRESENT) |
| 11 | Donor did not tick "sealed" | AUTO\_BLOCKED (SEALED\_DECLARED) |
| 12 | Cough syrup 100 ml, 9 months left, OCR confidence 0.45 | PENDING\_REVIEW with LOW\_OCR\_CONFIDENCE flag |
| 13 | Same medicine and batch as case 1, listed again | PENDING\_REVIEW with DUPLICATE\_BATCH flag |
| 14 | Vitamin C 500 mg, quantity 500 | PENDING\_REVIEW with QUANTITY\_UNUSUAL flag |
| 15 | Pantoprazole 40 mg, exactly 6 months left (boundary) | PENDING\_REVIEW |

Also seed 4 open needs (for example paracetamol high urgency, metformin medium, amoxicillin low, cetirizine medium) and a few items already at APPROVED, MATCHED and RECEIVED so the dashboard shows numbers on first load. Dates in the seed are calculated from today so the cases stay valid.

## 9. Key Queries

```sql
-- Pharmacist review queue (oldest first)
SELECT i.*, d.pickup_address
FROM donation_items i JOIN donations d ON d.id = i.donation_id
WHERE i.status = 'PENDING_REVIEW'
ORDER BY i.created_at ASC
LIMIT :limit OFFSET :offset;

-- Candidate needs for an approved item (distance and scoring done in code)
SELECT n.*, o.lat, o.lng, o.name AS org_name
FROM needs n JOIN organizations o ON o.id = n.org_id
WHERE n.status IN ('open','partially_fulfilled')
  AND n.quantity_remaining > 0
  AND o.verified = 1
  AND n.generic_name = :generic_name COLLATE NOCASE;

-- Items that should expire today
SELECT id FROM donation_items
WHERE status IN ('APPROVED','MATCHED')
  AND expiry_date < date('now', '+' || :min_months || ' months');

-- Suggested matches that timed out
SELECT id, item_id FROM matches
WHERE status = 'suggested' AND expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now');

-- Dashboard counts by status
SELECT status, COUNT(*) AS total FROM donation_items GROUP BY status;

-- Weekly items for the bar chart (last 8 weeks)
SELECT strftime('%Y-%W', created_at) AS week, COUNT(*) AS total
FROM donation_items
WHERE created_at >= date('now','-56 days')
GROUP BY week ORDER BY week;

-- Top rejection reasons for the donut chart
SELECT reject_reason_code, COUNT(*) AS total
FROM donation_items WHERE status = 'REJECTED'
GROUP BY reject_reason_code ORDER BY total DESC;

-- Duplicate batch check
SELECT COUNT(*) FROM donation_items
WHERE batch_no = :batch AND medicine_name = :name COLLATE NOCASE AND id <> :id;
```

## 10. Migrations, Backup and Moving to PostgreSQL

- Files: 001\_init.sql (tables), 002\_indexes\_triggers.sql, 003\_seed\_lookups.sql (settings, blocked list, aliases). Demo users and items come from the seed script, not from migrations.
- Commands: npm run db:migrate, npm run db:seed, npm run db:reset (drop the file, migrate, seed; development only).
- Enable WAL mode (PRAGMA journal\_mode = WAL) and a busy timeout for smoother use.
- Backup: copy the database file; add a script that does this with a date in the file name.
- Never edit an applied migration; add a new numbered file instead.

**When moving to PostgreSQL**

| SQLite (MVP) | PostgreSQL |
| --- | --- |
| TEXT ids | UUID with gen\_random\_uuid() |
| TEXT timestamps | TIMESTAMPTZ with default now() |
| INTEGER 0 or 1 | BOOLEAN |
| JSON as TEXT | JSONB |
| COLLATE NOCASE | CITEXT type or lower() indexes |
| CHECK enums | Keep CHECK or use ENUM types |
| Distance in code | PostGIS for geography and radius queries |
| strftime and date() | now(), CURRENT\_DATE, interval arithmetic |
| Trigger syntax | Rewrite as PL/pgSQL functions |

## 11. Privacy, Retention and Security

- Store only what the project needs. No real prescriptions, no health records, no real addresses in demos.
- Passwords only as bcrypt hashes. Refresh tokens only as hashes.
- Photos: stored outside the database with random file names; the table keeps only paths. Deleted after photo\_retention\_days.
- Notifications older than 180 days and expired or revoked refresh tokens are cleaned up by the weekly job.
- The audit log is never deleted during the project.
- The database file and uploads folder are in .gitignore. Never commit real or sample personal data.
- Use parameterised queries only.

## 12. Acceptance Checklist

1. npm run db:migrate creates every table, index and trigger without errors.
2. npm run db:seed creates the accounts, organisations, lookups, needs and the 15 test items.
3. Trying to insert an invalid status, a negative quantity or an item with an invalid expiry date format is rejected by the database.
4. Trying to accept two matches for the same item makes the second one fail.
5. Trying to update or delete an audit\_log row fails.
6. The key queries in Section 9 return correct results on the seed data.
7. The full flow from a listed item to RECEIVED can be followed in the audit log.

## 13. Prompts for Google Antigravity

Put PRD.md, BACKEND\_PRD.md and DATABASE\_PRD.md in the project folder.

### Prompt 1: schema and migrations

```
Read DATABASE_PRD.md. Create the database layer for MedicineLink using
SQLite with better-sqlite3 in a Node + TypeScript project:
- db/migrations/001_init.sql with the exact tables from Section 4
- 002_indexes_triggers.sql from Section 5
- 003_seed_lookups.sql with settings, blocked_medicines and
  medicine_aliases from Section 7 (about 20 aliases)
- a migration runner that applies files in order and records them in
  schema_migrations
- a connection module that turns on foreign keys, WAL mode and a busy
  timeout
- npm scripts: db:migrate, db:seed, db:reset
First show me a short plan. Then build it, run the migration, and print
the list of tables, indexes and triggers to prove it worked.
```

### Prompt 2: seed data

```
Write the seed script from DATABASE_PRD.md Section 8: the organisations,
users (password Demo@1234, hashed with bcrypt), the 15 eligibility test
items with dates calculated from today, 4 open needs, and a few items at
APPROVED, MATCHED and RECEIVED. Make it safe to run twice. Then write a
test that runs the database acceptance checklist in Section 12 and shows
that invalid data is rejected.
```

### Prompt 3: repositories

```
Create typed repository modules (one per table) with parameterised
queries only, including every query in DATABASE_PRD.md Section 9 and a
withTransaction helper. Add unit tests using an in-memory database.
```

## 14. Open Questions

- SQLite for the whole project, or PostgreSQL from the start (for example through Supabase)?
- Do we need a separate table for volunteers, or is a typed name on the pickup enough?
- Should medicine names come from a fixed catalogue instead of free text?
- How long should photos be kept in the real project?
