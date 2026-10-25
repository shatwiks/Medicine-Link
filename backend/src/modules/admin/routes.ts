import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/errors';
import { writeAuditLog } from '../audit/service';

export const adminRouter = Router();

const verifyOrgSchema = z.object({
  verified: z.boolean(),
  note: z.string().optional(),
});

const readNotifsSchema = z.object({
  ids: z.array(z.string()).optional(),
});

// GET /api/v1/health
adminRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'medicinelink-backend',
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/v1/state/sync — Hydrated SQLite snapshot for the frontend UI
adminRouter.get('/state/sync', authenticate, (_req, res) => {
  const db = getDb();

  const rawItems = db
    .prepare(
      `SELECT i.*, d.donor_id, d.pickup_address, d.pickup_window_start, d.lat, d.lng,
              d.declaration_sealed, d.declaration_room_temp,
              u.name AS donor_name, r.name AS reviewer_name
       FROM donation_items i
       JOIN donations d ON d.id = i.donation_id
       JOIN users u ON u.id = d.donor_id
       LEFT JOIN users r ON r.id = i.reviewer_id
       ORDER BY i.created_at DESC`
    )
    .all() as any[];

  const items = rawItems.map((row) => ({
    id: row.id,
    donation_id: row.donation_id,
    donor_id: row.donor_id,
    donor_name: row.donor_name || 'Household Donor',
    medicine_name: row.medicine_name,
    generic_name: row.generic_name || row.medicine_name.toLowerCase(),
    strength: row.strength || '',
    form: row.form,
    quantity: row.quantity,
    batch_no: row.batch_no || 'N/A',
    expiry_date: row.expiry_date || '2026-12-31',
    est_value: row.est_value ?? row.quantity * 5,
    is_rx_only: Boolean(row.is_rx_only),
    declaration_sealed: Boolean(row.declaration_sealed),
    declaration_room_temp: Boolean(row.declaration_room_temp),
    status: row.status,
    ocr_text:
      row.ocr_text ||
      `${String(row.medicine_name).toUpperCase()} | B.NO ${row.batch_no || 'N/A'} | EXP ${row.expiry_date || 'N/A'}`,
    ocr_confidence: row.ocr_confidence ?? 0.92,
    auto_check_result: row.auto_check_result ? JSON.parse(row.auto_check_result) : [],
    reviewer_id: row.reviewer_id || undefined,
    reviewer_name: row.reviewer_name || undefined,
    reviewed_at: row.reviewed_at || undefined,
    reject_reason_code: row.reject_reason_code || undefined,
    reject_note: row.reject_note || undefined,
    verification_code: row.verification_code || undefined,
    pickup_address: row.pickup_address,
    pickup_window: row.pickup_window_start || 'Flexible 10 AM – 6 PM',
    lat: row.lat ?? 12.9719,
    lng: row.lng ?? 77.6412,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const organizations = db
    .prepare('SELECT * FROM organizations ORDER BY created_at DESC')
    .all()
    .map((o: any) => ({
      ...o,
      verified: Boolean(o.verified),
    }));

  const needs = db
    .prepare(
      `SELECT n.*, o.name AS org_name
       FROM needs n
       JOIN organizations o ON o.id = n.org_id
       ORDER BY n.created_at DESC`
    )
    .all();

  const matches = db
    .prepare(
      `SELECT m.*, i.medicine_name, i.generic_name, i.strength, i.form,
              i.expiry_date, i.batch_no, i.verification_code,
              d.pickup_address, o.name AS org_name, n.urgency
       FROM matches m
       JOIN donation_items i ON i.id = m.item_id
       JOIN donations d ON d.id = i.donation_id
       JOIN organizations o ON o.id = m.org_id
       JOIN needs n ON n.id = m.need_id
       ORDER BY m.score DESC, m.created_at DESC`
    )
    .all()
    .map((m: any) => {
      const parsed = m.score_breakdown ? JSON.parse(m.score_breakdown) : {};
      return {
        id: m.id,
        item_id: m.item_id,
        need_id: m.need_id,
        org_id: m.org_id,
        org_name: m.org_name,
        medicine_name: m.medicine_name,
        generic_name: m.generic_name || m.medicine_name.toLowerCase(),
        strength: m.strength || '',
        form: m.form,
        quantity_allocated: m.quantity_allocated,
        expiry_date: m.expiry_date || '2027-12-31',
        batch_no: m.batch_no || 'N/A',
        verification_code: m.verification_code || undefined,
        pickup_address: m.pickup_address,
        score: m.score,
        score_breakdown: {
          medicine_score: parsed.medicine_score ?? 50,
          medicine_reason:
            parsed.medicine_reason ||
            `Generic (${m.generic_name || m.medicine_name}) & strength (${m.strength || 'standard'}) match`,
          distance_score: parsed.distance_score ?? 30,
          distance_km: parsed.distance_km ?? 1.4,
          urgency_score: parsed.urgency_score ?? 12,
          urgency_level: parsed.urgency_level || m.urgency || 'medium',
        },
        status: m.status,
        expires_at: m.expires_at,
        created_at: m.created_at,
      };
    });

  const pickups = db
    .prepare(
      `SELECT p.*, m.item_id, i.medicine_name, i.strength, m.quantity_allocated AS quantity,
              i.verification_code, d.pickup_address, u.name AS donor_name, o.name AS org_name
       FROM pickups p
       JOIN matches m ON m.id = p.match_id
       JOIN donation_items i ON i.id = m.item_id
       JOIN donations d ON d.id = i.donation_id
       JOIN users u ON u.id = d.donor_id
       JOIN organizations o ON o.id = m.org_id
       ORDER BY p.created_at DESC`
    )
    .all();

  const auditLog = db
    .prepare(
      `SELECT a.*, COALESCE(u.name, 'System Engine') AS actor_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.id DESC
       LIMIT 100`
    )
    .all()
    .map((a: any) => ({
      id: a.id,
      actor_name: a.actor_name,
      actor_role: a.actor_role || 'system',
      action: a.action,
      entity: a.entity,
      entity_id: a.entity_id || 'global',
      details: typeof a.details === 'string' ? a.details : JSON.stringify(a.details || {}),
      created_at: a.created_at,
    }));

  const settingRows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const settingMap = new Map(settingRows.map((s) => [s.key, s.value]));

  res.json({
    success: true,
    data: {
      items,
      organizations,
      needs,
      matches,
      pickups,
      auditLog,
      settings: {
        min_shelf_life_months: Number(settingMap.get('min_shelf_life_months') ?? 6),
        match_expiry_hours: Number(settingMap.get('match_expiry_hours') ?? 48),
        max_distance_km: Number(settingMap.get('max_distance_km') ?? 25),
        ocr_low_confidence: Number(settingMap.get('ocr_low_confidence') ?? 0.6),
        quantity_unusual_limit: Number(settingMap.get('quantity_unusual_limit') ?? 100),
      },
    },
  });
});

// GET /api/v1/notifications
adminRouter.get('/notifications', authenticate, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    )
    .all(req.user!.id);

  res.json({
    success: true,
    data: { notifications: rows },
  });
});

// POST /api/v1/notifications/read
adminRouter.post(
  '/notifications/read',
  authenticate,
  validateBody(readNotifsSchema),
  (req, res) => {
    const db = getDb();
    const ids: string[] | undefined = req.body.ids;
    if (ids && ids.length > 0) {
      const stmt = db.prepare(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
      );
      for (const id of ids) {
        stmt.run(id, req.user!.id);
      }
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(
        req.user!.id
      );
    }
    res.json({ success: true, data: { markedRead: true } });
  }
);

// GET /api/v1/dashboard/stats
adminRouter.get('/dashboard/stats', authenticate, (_req, res) => {
  const db = getDb();
  const statusRows = db
    .prepare('SELECT status, COUNT(*) AS total FROM donation_items GROUP BY status')
    .all() as { status: string; total: number }[];

  const byStatus: Record<string, number> = {};
  let totalItems = 0;
  for (const r of statusRows) {
    byStatus[r.status] = r.total;
    totalItems += r.total;
  }

  const valueRow = db
    .prepare(
      `SELECT COALESCE(SUM(est_value), 0) AS total_value
       FROM donation_items
       WHERE status NOT IN ('AUTO_BLOCKED','REJECTED','CANCELLED')`
    )
    .get() as { total_value: number };

  const rejectionReasons = db
    .prepare(
      `SELECT reject_reason_code, COUNT(*) AS total
       FROM donation_items
       WHERE status = 'REJECTED'
       GROUP BY reject_reason_code
       ORDER BY total DESC`
    )
    .all();

  res.json({
    success: true,
    data: {
      totalItems,
      byStatus,
      estimatedValueSaved: valueRow?.total_value ?? 0,
      rejectionReasons,
    },
  });
});

// GET /api/v1/dashboard/timeseries
adminRouter.get(
  '/dashboard/timeseries',
  authenticate,
  requireRole('admin'),
  (_req, res) => {
    const db = getDb();
    const weekly = db
      .prepare(
        `SELECT strftime('%Y-%W', created_at) AS week, COUNT(*) AS total
         FROM donation_items
         WHERE created_at >= date('now','-56 days')
         GROUP BY week
         ORDER BY week`
      )
      .all();

    res.json({
      success: true,
      data: { series: weekly },
    });
  }
);

// GET /api/v1/admin/organizations
adminRouter.get(
  '/admin/organizations',
  authenticate,
  requireRole('admin'),
  (req, res) => {
    const db = getDb();
    const verifiedParam = req.query.verified;
    let rows;
    if (verifiedParam === 'false') {
      rows = db
        .prepare('SELECT * FROM organizations WHERE verified = 0 ORDER BY created_at DESC')
        .all();
    } else if (verifiedParam === 'true') {
      rows = db
        .prepare('SELECT * FROM organizations WHERE verified = 1 ORDER BY created_at DESC')
        .all();
    } else {
      rows = db.prepare('SELECT * FROM organizations ORDER BY created_at DESC').all();
    }

    res.json({
      success: true,
      data: { organizations: rows },
    });
  }
);

// POST /api/v1/admin/organizations/:id/verify
adminRouter.post(
  '/admin/organizations/:id/verify',
  authenticate,
  requireRole('admin'),
  validateBody(verifyOrgSchema),
  (req, res, next) => {
    try {
      const db = getDb();
      const org = db
        .prepare('SELECT * FROM organizations WHERE id = ?')
        .get(req.params.id) as any;

      if (!org) {
        throw new AppError(404, 'NOT_FOUND', 'Organisation not found');
      }

      const now = new Date().toISOString();
      db.prepare(
        `UPDATE organizations
         SET verified = ?,
             verified_by = ?,
             verified_at = ?,
             verification_note = COALESCE(?, verification_note),
             updated_at = ?
         WHERE id = ?`
      ).run(
        req.body.verified ? 1 : 0,
        req.user!.id,
        now,
        req.body.note ?? null,
        now,
        org.id
      );

      writeAuditLog(
        {
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: req.body.verified ? 'ORG_VERIFIED' : 'ORG_UNVERIFIED',
          entity: 'organization',
          entityId: org.id,
          details: { verified: req.body.verified, note: req.body.note || null },
          requestId: req.requestId,
        },
        db
      );

      const updated = db
        .prepare('SELECT * FROM organizations WHERE id = ?')
        .get(org.id);

      res.json({
        success: true,
        data: { organization: updated },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/admin/audit
adminRouter.get(
  '/admin/audit',
  authenticate,
  requireRole('admin'),
  (req, res) => {
    const db = getDb();
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const rows = db
      .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?')
      .all(limit);

    res.json({
      success: true,
      data: { audit: rows },
    });
  }
);

// GET /api/v1/admin/settings
adminRouter.get(
  '/admin/settings',
  authenticate,
  requireRole('admin'),
  (_req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM settings ORDER BY key ASC').all();
    res.json({
      success: true,
      data: { settings: rows },
    });
  }
);

// PATCH /api/v1/admin/settings
adminRouter.patch(
  '/admin/settings',
  authenticate,
  requireRole('admin'),
  (req, res) => {
    const db = getDb();
    const updates = req.body || {};
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      const stmt = db.prepare(
        `UPDATE settings SET value = ?, updated_by = ?, updated_at = ? WHERE key = ?`
      );
      for (const [k, v] of Object.entries(updates)) {
        stmt.run(String(v), req.user!.id, now, k);
      }
      writeAuditLog(
        {
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'SETTINGS_CHANGED',
          entity: 'settings',
          entityId: 'global',
          details: updates,
          requestId: req.requestId,
        },
        db
      );
    });

    tx();

    const rows = db.prepare('SELECT * FROM settings ORDER BY key ASC').all();
    res.json({
      success: true,
      data: { settings: rows },
    });
  }
);
