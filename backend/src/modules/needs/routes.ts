import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection';
import { authenticate, requireRole, requireVerifiedOrg } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/errors';
import { writeAuditLog } from '../audit/service';
import { resolveGenericMedicineName } from '../eligibility/engine';
import { respondToMatchSuggestion, runMatchingForNeed } from '../matching/service';

export const needsRouter = Router();

const createNeedSchema = z.object({
  medicine_name: z.string().min(1),
  strength: z.string().optional().nullable(),
  quantity_needed: z.number().int().positive(),
  urgency: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

const patchNeedSchema = z.object({
  quantity_needed: z.number().int().positive().optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['open', 'partially_fulfilled', 'fulfilled', 'cancelled']).optional(),
});

const respondMatchSchema = z.object({
  response: z.enum(['accept', 'decline']),
});

// POST /api/v1/needs
needsRouter.post(
  '/needs',
  authenticate,
  requireRole('ngo'),
  requireVerifiedOrg,
  validateBody(createNeedSchema),
  (req, res, next) => {
    try {
      const db = getDb();
      const { medicine_name, strength, quantity_needed, urgency } = req.body;
      const needId = crypto.randomUUID();
      const genericName = resolveGenericMedicineName(medicine_name, db);

      db.prepare(
        `INSERT INTO needs (
          id, org_id, created_by, medicine_name, generic_name,
          strength, quantity_needed, quantity_remaining, urgency, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
      ).run(
        needId,
        req.user!.orgId,
        req.user!.id,
        medicine_name,
        genericName,
        strength || null,
        quantity_needed,
        quantity_needed,
        urgency
      );

      writeAuditLog(
        {
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'NEED_CREATED',
          entity: 'need',
          entityId: needId,
          details: { medicine_name, genericName, quantity_needed, urgency },
          requestId: req.requestId,
        },
        db
      );

      const matchesTriggered = runMatchingForNeed(needId, db);
      const created = db.prepare('SELECT * FROM needs WHERE id = ?').get(needId);

      res.status(201).json({
        success: true,
        data: {
          need: created,
          matchesTriggered,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/needs
needsRouter.get(
  '/needs',
  authenticate,
  requireRole('ngo', 'admin'),
  (req, res) => {
    const db = getDb();
    const isAdmin = req.user!.role === 'admin';
    const rows = isAdmin
      ? db.prepare('SELECT * FROM needs ORDER BY created_at DESC').all()
      : db
          .prepare('SELECT * FROM needs WHERE org_id = ? ORDER BY created_at DESC')
          .all(req.user!.orgId);

    res.json({
      success: true,
      data: { needs: rows },
    });
  }
);

// PATCH /api/v1/needs/:id
needsRouter.patch(
  '/needs/:id',
  authenticate,
  requireRole('ngo'),
  requireVerifiedOrg,
  validateBody(patchNeedSchema),
  (req, res, next) => {
    try {
      const db = getDb();
      const need = db.prepare('SELECT * FROM needs WHERE id = ?').get(req.params.id) as any;
      if (!need) {
        throw new AppError(404, 'NOT_FOUND', 'Need not found');
      }
      if (need.org_id !== req.user!.orgId) {
        throw new AppError(403, 'FORBIDDEN', 'You can only update your own organisation needs');
      }

      const nextQtyNeeded = req.body.quantity_needed ?? need.quantity_needed;
      const nextRemaining = Math.min(nextQtyNeeded, need.quantity_remaining);

      db.prepare(
        `UPDATE needs
         SET quantity_needed = ?,
             quantity_remaining = ?,
             urgency = COALESCE(?, urgency),
             status = COALESCE(?, status),
             updated_at = ?
         WHERE id = ?`
      ).run(
        nextQtyNeeded,
        nextRemaining,
        req.body.urgency ?? null,
        req.body.status ?? null,
        new Date().toISOString(),
        need.id
      );

      const updated = db.prepare('SELECT * FROM needs WHERE id = ?').get(need.id);
      res.json({
        success: true,
        data: { need: updated },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/matches
needsRouter.get(
  '/matches',
  authenticate,
  requireRole('ngo', 'admin'),
  (req, res) => {
    const db = getDb();
    const isAdmin = req.user!.role === 'admin';
    const rows = (
      isAdmin
        ? db
            .prepare(
              `SELECT m.*, i.medicine_name, i.generic_name, i.strength, i.form,
                      i.expiry_date, i.batch_no, i.verification_code, o.name AS org_name
               FROM matches m
               JOIN donation_items i ON i.id = m.item_id
               JOIN organizations o ON o.id = m.org_id
               ORDER BY m.score DESC, m.created_at DESC`
            )
            .all()
        : db
            .prepare(
              `SELECT m.*, i.medicine_name, i.generic_name, i.strength, i.form,
                      i.expiry_date, i.batch_no, i.verification_code, o.name AS org_name
               FROM matches m
               JOIN donation_items i ON i.id = m.item_id
               JOIN organizations o ON o.id = m.org_id
               WHERE m.org_id = ?
               ORDER BY m.score DESC, m.created_at DESC`
            )
            .all(req.user!.orgId)
    ).map((m: any) => ({
      ...m,
      score_breakdown: m.score_breakdown ? JSON.parse(m.score_breakdown) : {},
    }));

    res.json({
      success: true,
      data: { matches: rows },
    });
  }
);

// POST /api/v1/matches/:id/respond
needsRouter.post(
  '/matches/:id/respond',
  authenticate,
  requireRole('ngo'),
  requireVerifiedOrg,
  validateBody(respondMatchSchema),
  (req, res, next) => {
    try {
      const updated = respondToMatchSuggestion({
        matchId: req.params.id,
        response: req.body.response,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        actorOrgId: req.user!.orgId,
        requestId: req.requestId,
      });

      res.json({
        success: true,
        data: {
          match: {
            ...updated,
            score_breakdown: updated.score_breakdown
              ? JSON.parse(updated.score_breakdown)
              : {},
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
