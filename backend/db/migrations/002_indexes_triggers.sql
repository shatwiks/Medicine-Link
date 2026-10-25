-- Lookups and lists
CREATE INDEX IF NOT EXISTS ix_users_org            ON users(org_id);
CREATE INDEX IF NOT EXISTS ix_refresh_user         ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_donations_donor      ON donations(donor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_items_donation       ON donation_items(donation_id);
CREATE INDEX IF NOT EXISTS ix_items_status_created ON donation_items(status, created_at);
CREATE INDEX IF NOT EXISTS ix_items_expiry         ON donation_items(expiry_date) WHERE status IN ('APPROVED','MATCHED');
CREATE INDEX IF NOT EXISTS ix_items_batch          ON donation_items(batch_no, medicine_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS ix_photos_item          ON item_photos(item_id);
CREATE INDEX IF NOT EXISTS ix_needs_open           ON needs(generic_name COLLATE NOCASE, urgency) WHERE status IN ('open','partially_fulfilled');
CREATE INDEX IF NOT EXISTS ix_needs_org            ON needs(org_id, status);
CREATE INDEX IF NOT EXISTS ix_matches_org_status   ON matches(org_id, status);
CREATE INDEX IF NOT EXISTS ix_matches_expiry       ON matches(expires_at) WHERE status = 'suggested';
CREATE INDEX IF NOT EXISTS ix_notif_user_unread    ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_entity         ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS ix_audit_actor_time     ON audit_log(actor_id, created_at DESC);

-- First accept wins: only one accepted or completed match per item
CREATE UNIQUE INDEX IF NOT EXISTS ux_matches_one_accepted
  ON matches(item_id) WHERE status IN ('accepted','completed');

-- Audit log is append-only
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;

CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
