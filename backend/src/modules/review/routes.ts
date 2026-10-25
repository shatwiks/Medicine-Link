import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection';
import { authenticate, requireRole, requireVerifiedOrg } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/errors';
import { transitionItemStatus } from '../donations/stateMachine';
import { runMatchingForItem } from '../matching/service';
import { createNotification } from '../notifications/service';

export const reviewRouter = Router();

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reject_reason_code: z
    .enum([
      'EXPIRY_UNREADABLE',
      'BATCH_UNREADABLE',
      'DAMAGED_PACK',
      'OPENED_PACK',
      'NOT_ALLOWED_TYPE',
      'SUSPECTED_TAMPERING',
      'SHORT_SHELF_LIFE',
      'OTHER',
    ])
    .optional(),
  note: z.string().optional(),
});

// GET /api/v1/review/queue
reviewRouter.get(
  '/review/queue',
  authenticate,
  requireRole('pharmacist', 'admin'),
  requireVerifiedOrg,
  (req, res) => {
    const db = getDb();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const rows = db
      .prepare(
        `SELECT i.*, d.pickup_address, d.donor_id, u.name AS donor_name
         FROM donation_items i
         JOIN donations d ON d.id = i.donation_id
         JOIN users u ON u.id = d.donor_id
         WHERE i.status = 'PENDING_REVIEW'
         ORDER BY i.created_at ASC
         LIMIT ? OFFSET ?`
      )
      .all(limit, offset)
      .map((i: any) => ({
        ...i,
        auto_check_result: i.auto_check_result ? JSON.parse(i.auto_check_result) : [],
      }));

    res.json({
      success: true,
      data: {
        items: rows,
        page,
        limit,
      },
    });
  }
);

// GET /api/v1/review/items/:id
reviewRouter.get(
  '/review/items/:id',
  authenticate,
  requireRole('pharmacist', 'admin'),
  requireVerifiedOrg,
  (req, res, next) => {
    try {
      const db = getDb();
      const item = db
        .prepare(
          `SELECT i.*, d.pickup_address, d.donor_id, u.name AS donor_name
           FROM donation_items i
           JOIN donations d ON d.id = i.donation_id
           JOIN users u ON u.id = d.donor_id
           WHERE i.id = ?`
        )
        .get(req.params.id) as any;

      if (!item) {
        throw new AppError(404, 'NOT_FOUND', 'Item not found');
      }

      const photos = db
        .prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY position ASC')
        .all(item.id);

      res.json({
        success: true,
        data: {
          item: {
            ...item,
            auto_check_result: item.auto_check_result ? JSON.parse(item.auto_check_result) : [],
            photos,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/review/items/:id/decision
reviewRouter.post(
  '/review/items/:id/decision',
  authenticate,
  requireRole('pharmacist'),
  requireVerifiedOrg,
  validateBody(decisionSchema),
  (req, res, next) => {
    try {
      const db = getDb();
      const { decision, reject_reason_code, note } = req.body;

      if (decision === 'reject' && !reject_reason_code) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'reject_reason_code is required when rejecting an item'
        );
      }

      const item = db
        .prepare(
          `SELECT i.*, d.donor_id
           FROM donation_items i
           JOIN donations d ON d.id = i.donation_id
           WHERE i.id = ?`
        )
        .get(req.params.id) as any;

      if (!item) {
        throw new AppError(404, 'NOT_FOUND', 'Item not found');
      }

      const now = new Date().toISOString();
      const verificationCode =
        decision === 'approve'
          ? `ML-VER-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
          : null;

      transitionItemStatus(
        {
          itemId: item.id,
          toStatus: decision === 'approve' ? 'APPROVED' : 'REJECTED',
          actorId: req.user!.id,
          actorRole: req.user!.role,
          requestId: req.requestId,
          details: {
            decision,
            reject_reason_code: reject_reason_code || null,
            note: note || null,
            verificationCode,
          },
          extraFields: {
            reviewerId: req.user!.id,
            reviewedAt: now,
            rejectReasonCode: decision === 'reject' ? reject_reason_code : null,
            rejectNote: note || null,
            verificationCode,
          },
        },
        db
      );

      createNotification(
        {
          userId: item.donor_id,
          type: decision === 'approve' ? 'ITEM_APPROVED' : 'ITEM_REJECTED',
          message:
            decision === 'approve'
              ? `Your item ${item.medicine_name} was approved by a pharmacist (Code: ${verificationCode}).`
              : `Your item ${item.medicine_name} was rejected (${reject_reason_code}).`,
          entity: 'donation_item',
          entityId: item.id,
        },
        db
      );

      let matchesCreated = 0;
      if (decision === 'approve') {
        matchesCreated = runMatchingForItem(item.id, db);
      }

      const updated = db
        .prepare('SELECT * FROM donation_items WHERE id = ?')
        .get(item.id) as any;

      res.json({
        success: true,
        data: {
          item: {
            ...updated,
            auto_check_result: updated.auto_check_result
              ? JSON.parse(updated.auto_check_result)
              : [],
          },
          matchesCreated,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/review/history
reviewRouter.get(
  '/review/history',
  authenticate,
  requireRole('pharmacist', 'admin'),
  (req, res) => {
    const db = getDb();
    const isAdmin = req.user!.role === 'admin';
    const rows = isAdmin
      ? db
          .prepare(
            `SELECT * FROM donation_items
             WHERE reviewer_id IS NOT NULL
             ORDER BY reviewed_at DESC`
          )
          .all()
      : db
          .prepare(
            `SELECT * FROM donation_items
             WHERE reviewer_id = ?
             ORDER BY reviewed_at DESC`
          )
          .all(req.user!.id);

    res.json({
      success: true,
      data: { items: rows },
    });
  }
);
