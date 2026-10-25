import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection';
import { authenticate, requireRole, requireVerifiedOrg } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/errors';
import { writeAuditLog } from '../audit/service';
import { transitionItemStatus } from '../donations/stateMachine';

export const pickupsRouter = Router();

const createPickupSchema = z.object({
  match_id: z.string().min(1),
  volunteer_name: z.string().min(2),
  volunteer_phone: z.string().optional().nullable(),
  scheduled_at: z.string().min(4),
});

const patchPickupSchema = z.object({
  status: z.enum(['picked_up', 'delivered', 'failed']),
  notes: z.string().optional().nullable(),
});

const confirmReceivedSchema = z.object({
  notes: z.string().optional().nullable(),
});

// POST /api/v1/pickups
pickupsRouter.post(
  '/pickups',
  authenticate,
  requireRole('admin', 'ngo', 'pharmacist'),
  requireVerifiedOrg,
  validateBody(createPickupSchema),
  (req, res, next) => {
    try {
      const db = getDb();
      const { match_id, volunteer_name, volunteer_phone, scheduled_at } = req.body;

      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id) as any;
      if (!match) {
        throw new AppError(404, 'NOT_FOUND', 'Match not found');
      }
      if (match.status !== 'accepted') {
        throw new AppError(
          409,
          'INVALID_STATE',
          'Pickup can only be scheduled for an accepted match'
        );
      }

      const pickupId = crypto.randomUUID();
      const tx = db.transaction(() => {
        db.prepare(
          `INSERT INTO pickups (
            id, match_id, volunteer_name, volunteer_phone, scheduled_at, status
          ) VALUES (?, ?, ?, ?, ?, 'scheduled')`
        ).run(
          pickupId,
          match.id,
          volunteer_name,
          volunteer_phone || null,
          scheduled_at
        );

        transitionItemStatus(
          {
            itemId: match.item_id,
            toStatus: 'PICKUP_SCHEDULED',
            actorId: req.user!.id,
            actorRole: req.user!.role,
            requestId: req.requestId,
            details: { pickupId, volunteer_name, scheduled_at },
          },
          db
        );
      });

      tx();

      const pickup = db.prepare('SELECT * FROM pickups WHERE id = ?').get(pickupId);
      res.status(201).json({
        success: true,
        data: { pickup },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/pickups/:id
pickupsRouter.patch(
  '/pickups/:id',
  authenticate,
  requireRole('admin', 'ngo', 'pharmacist'),
  requireVerifiedOrg,
  validateBody(patchPickupSchema),
  (req, res, next) => {
    try {
      const db = getDb();
      const { status, notes } = req.body;
      const pickup = db
        .prepare(
          `SELECT p.*, m.item_id
           FROM pickups p
           JOIN matches m ON m.id = p.match_id
           WHERE p.id = ?`
        )
        .get(req.params.id) as any;

      if (!pickup) {
        throw new AppError(404, 'NOT_FOUND', 'Pickup not found');
      }

      const now = new Date().toISOString();
      const tx = db.transaction(() => {
        if (status === 'picked_up') {
          db.prepare(
            `UPDATE pickups
             SET status = 'picked_up', picked_up_at = ?, notes = COALESCE(?, notes), updated_at = ?
             WHERE id = ?`
          ).run(now, notes ?? null, now, pickup.id);

          transitionItemStatus(
            {
              itemId: pickup.item_id,
              toStatus: 'PICKED_UP',
              actorId: req.user!.id,
              actorRole: req.user!.role,
              requestId: req.requestId,
            },
            db
          );
        } else if (status === 'delivered') {
          db.prepare(
            `UPDATE pickups
             SET status = 'delivered', delivered_at = ?, notes = COALESCE(?, notes), updated_at = ?
             WHERE id = ?`
          ).run(now, notes ?? null, now, pickup.id);

          transitionItemStatus(
            {
              itemId: pickup.item_id,
              toStatus: 'DELIVERED',
              actorId: req.user!.id,
              actorRole: req.user!.role,
              requestId: req.requestId,
            },
            db
          );
        } else if (status === 'failed') {
          db.prepare(
            `UPDATE pickups
             SET status = 'failed', notes = COALESCE(?, notes), updated_at = ?
             WHERE id = ?`
          ).run(notes ?? null, now, pickup.id);
        }
      });

      tx();

      const updated = db.prepare('SELECT * FROM pickups WHERE id = ?').get(pickup.id);
      res.json({
        success: true,
        data: { pickup: updated },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/pickups/:id/confirm-received
pickupsRouter.post(
  '/pickups/:id/confirm-received',
  authenticate,
  requireRole('ngo', 'admin'),
  requireVerifiedOrg,
  validateBody(confirmReceivedSchema),
  (req, res, next) => {
    try {
      const db = getDb();
      const pickup = db
        .prepare(
          `SELECT p.*, m.item_id, m.org_id, m.id AS match_id
           FROM pickups p
           JOIN matches m ON m.id = p.match_id
           WHERE p.id = ?`
        )
        .get(req.params.id) as any;

      if (!pickup) {
        throw new AppError(404, 'NOT_FOUND', 'Pickup not found');
      }
      if (req.user!.role !== 'admin' && pickup.org_id !== req.user!.orgId) {
        throw new AppError(403, 'FORBIDDEN', 'Only the receiving organisation can confirm receipt');
      }

      const now = new Date().toISOString();
      const tx = db.transaction(() => {
        db.prepare(
          `UPDATE pickups
           SET status = 'received', received_at = ?, received_by = ?, notes = COALESCE(?, notes), updated_at = ?
           WHERE id = ?`
        ).run(now, req.user!.id, req.body.notes ?? null, now, pickup.id);

        db.prepare(
          `UPDATE matches SET status = 'completed', updated_at = ? WHERE id = ?`
        ).run(now, pickup.match_id);

        transitionItemStatus(
          {
            itemId: pickup.item_id,
            toStatus: 'RECEIVED',
            actorId: req.user!.id,
            actorRole: req.user!.role,
            requestId: req.requestId,
            details: { pickupId: pickup.id },
          },
          db
        );

        writeAuditLog(
          {
            actorId: req.user!.id,
            actorRole: req.user!.role,
            action: 'RECEIPT_CONFIRMED',
            entity: 'pickup',
            entityId: pickup.id,
            details: { itemId: pickup.item_id, matchId: pickup.match_id },
            requestId: req.requestId,
          },
          db
        );
      });

      tx();

      const updatedPickup = db.prepare('SELECT * FROM pickups WHERE id = ?').get(pickup.id);
      const updatedItem = db
        .prepare('SELECT * FROM donation_items WHERE id = ?')
        .get(pickup.item_id);

      res.json({
        success: true,
        data: {
          pickup: updatedPickup,
          item: updatedItem,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/pickups
pickupsRouter.get(
  '/pickups',
  authenticate,
  requireRole('ngo', 'admin', 'pharmacist'),
  (req, res) => {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT p.*, m.item_id, m.org_id, i.medicine_name, i.strength, i.quantity
         FROM pickups p
         JOIN matches m ON m.id = p.match_id
         JOIN donation_items i ON i.id = m.item_id
         ORDER BY p.created_at DESC`
      )
      .all();

    res.json({
      success: true,
      data: { pickups: rows },
    });
  }
);
