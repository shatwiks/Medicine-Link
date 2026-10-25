PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS organizations (
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

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS donations (
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

CREATE TABLE IF NOT EXISTS donation_items (
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

CREATE TABLE IF NOT EXISTS item_photos (
  id          TEXT PRIMARY KEY,
  item_id     TEXT REFERENCES donation_items(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  file_path   TEXT NOT NULL,
  mime_type   TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes  INTEGER NOT NULL CHECK (size_bytes > 0),
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS needs (
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

CREATE TABLE IF NOT EXISTS matches (
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

CREATE TABLE IF NOT EXISTS pickups (
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

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
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

CREATE TABLE IF NOT EXISTS blocked_medicines (
  id       TEXT PRIMARY KEY,
  keyword  TEXT NOT NULL UNIQUE COLLATE NOCASE,
  category TEXT NOT NULL CHECK (category IN ('injectable','cold_chain','controlled','other')),
  reason   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medicine_aliases (
  id           TEXT PRIMARY KEY,
  alias        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  generic_name TEXT NOT NULL COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_by  TEXT REFERENCES users(id),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
