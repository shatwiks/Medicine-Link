import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection';
import { authenticate, requireRole } from '../../middleware/auth';
import { uploadPhotoMiddleware, validateAndSavePhotoBuffer } from '../../middleware/upload';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/errors';
import { writeAuditLog } from '../audit/service';
import { runEligibilityEngine } from '../eligibility/engine';
import { createNotification, notifyRoleUsers } from '../notifications/service';
import { defaultOcrProvider } from '../ocr/service';
import { transitionItemStatus } from './stateMachine';

export const donationsRouter = Router();

const donationItemInputSchema = z.object({
  medicine_name: z.string().min(1),
  strength: z.string().optional().nullable(),
  form: z.enum([
    'tablet',
    'capsule',
    'syrup',
    'ointment',
    'drops',
    'inhaler',
    'powder',
    'other',
  ]),
  quantity: z.number().int().positive(),
  batch_no: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  est_value: z.number().nonnegative().optional().nullable(),
  is_rx_only: z.boolean().optional().default(false),
  ocr_text: z.string().optional().nullable(),
  ocr_confidence: z.number().min(0).max(1).optional().nullable(),
});

const createDonationSchema = z.object({
  pickup_address: z.string().min(3),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  pickup_window_start: z.string().optional().nullable(),
  pickup_window_end: z.string().optional().nullable(),
  drop_at_org_id: z.string().optional().nullable(),
  declaration_sealed: z.boolean(),
  declaration_room_temp: z.boolean(),
  items: z.array(donationItemInputSchema).min(1),
});

const patchItemSchema = z.object({
  medicine_name: z.string().min(1).optional(),
  strength: z.string().optional().nullable(),
  form: z
    .enum([
      'tablet',
      'capsule',
      'syrup',
      'ointment',
      'drops',
      'inhaler',
      'powder',
      'other',
    ])
    .optional(),
  quantity: z.number().int().positive().optional(),
  batch_no: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  is_rx_only: z.boolean().optional(),
});

// POST /api/v1/items/ocr
donationsRouter.post(
  '/items/ocr',
  authenticate,
  requireRole('donor', 'pharmacist', 'admin'),
  uploadPhotoMiddleware,
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Photo file is required');
      }
      validateAndSavePhotoBuffer(req.file.buffer);
      const ocrResult = await defaultOcrProvider.recognizeImage(req.file.buffer);
      res.json({
        success: true,
        data: ocrResult,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/donations
donationsRouter.post(
  '/donations',
  authenticate,
  requireRole('donor'),
  validateBody(createDonationSchema),
  (req, res, next) => {
    try {
      const db = getDb();
      const body = req.body;
      const donationId = crypto.randomUUID();
      const createdItems: any[] = [];

      const tx = db.transaction(() => {
        db.prepare(
          `INSERT INTO donations (
            id, donor_id, pickup_address, lat, lng,
            pickup_window_start, pickup_window_end, drop_at_org_id,
            declaration_sealed, declaration_room_temp, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
        ).run(
          donationId,
          req.user!.id,
          body.pickup_address,
          body.lat ?? 12.9719,
          body.lng ?? 77.6412,
          body.pickup_window_start || null,
          body.pickup_window_end || null,
          body.drop_at_org_id || null,
          body.declaration_sealed ? 1 : 0,
          body.declaration_room_temp ? 1 : 0
        );

        for (const itm of body.items) {
          const itemId = crypto.randomUUID();
          const evalRes = runEligibilityEngine(
            {
              itemId,
              medicineName: itm.medicine_name,
              strength: itm.strength,
              form: itm.form,
              quantity: itm.quantity,
              batchNo: itm.batch_no,
              expiryDate: itm.expiry_date,
              isRxOnly: Boolean(itm.is_rx_only),
              declarationSealed: body.declaration_sealed,
              declarationRoomTemp: body.declaration_room_temp,
              ocrConfidence: itm.ocr_confidence,
            },
            db
          );

          // Insert as LISTED first
          db.prepare(
            `INSERT INTO donation_items (
              id, donation_id, medicine_name, generic_name, strength, form,
              quantity, batch_no, expiry_date, est_value, is_rx_only,
              status, ocr_text, ocr_confidence, auto_check_result
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LISTED', ?, ?, ?)`
          ).run(
            itemId,
            donationId,
            itm.medicine_name,
            evalRes.genericName,
            itm.strength || null,
            itm.form,
            itm.quantity,
            itm.batch_no || null,
            itm.expiry_date || null,
            itm.est_value ?? itm.quantity * 5,
            itm.is_rx_only ? 1 : 0,
            itm.ocr_text || null,
            itm.ocr_confidence ?? null,
            JSON.stringify(evalRes.results)
          );

          writeAuditLog(
            {
              actorId: req.user!.id,
              actorRole: req.user!.role,
              action: 'ITEM_CREATED_LISTED',
              entity: 'donation_item',
              entityId: itemId,
              details: { medicineName: itm.medicine_name },
              requestId: req.requestId,
            },
            db
          );

          const nextStatus = evalRes.passedHardRules ? 'PENDING_REVIEW' : 'AUTO_BLOCKED';
          transitionItemStatus(
            {
              itemId,
              toStatus: nextStatus,
              actorId: req.user!.id,
              actorRole: req.user!.role,
              requestId: req.requestId,
              details: { passedHardRules: evalRes.passedHardRules },
            },
            db
          );

          if (evalRes.passedHardRules) {
            notifyRoleUsers(
              'pharmacist',
              'ITEM_PENDING_REVIEW',
              `New pack waiting for review: ${itm.medicine_name}`,
              'donation_item',
              itemId,
              db
            );
          } else {
            createNotification(
              {
                userId: req.user!.id,
                type: 'ITEM_AUTO_BLOCKED',
                message: `Your item ${itm.medicine_name} was automatically blocked by safety rules.`,
                entity: 'donation_item',
                entityId: itemId,
              },
              db
            );
          }

          const saved = db
            .prepare('SELECT * FROM donation_items WHERE id = ?')
            .get(itemId) as any;
          createdItems.push({
            ...saved,
            auto_check_result: JSON.parse(saved.auto_check_result || '[]'),
          });
        }
      });

      tx();

      const donation = db
        .prepare('SELECT * FROM donations WHERE id = ?')
        .get(donationId);

      res.status(201).json({
        success: true,
        data: {
          donation,
          items: createdItems,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/donations/:id/photos
donationsRouter.post(
  '/donations/:id/photos',
  authenticate,
  requireRole('donor'),
  uploadPhotoMiddleware,
  (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Photo file is required');
      }
      const db = getDb();
      const donation = db
        .prepare('SELECT * FROM donations WHERE id = ?')
        .get(req.params.id) as any;
      if (!donation) {
        throw new AppError(404, 'NOT_FOUND', 'Donation not found');
      }
      if (donation.donor_id !== req.user!.id) {
        throw new AppError(403, 'FORBIDDEN', 'You can only upload photos to your own donation');
      }

      const savedFile = validateAndSavePhotoBuffer(req.file.buffer);
      const photoId = crypto.randomUUID();
      const itemId = req.body.item_id || null;

      db.prepare(
        `INSERT INTO item_photos (id, item_id, uploaded_by, file_path, mime_type, size_bytes, position)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      ).run(
        photoId,
        itemId,
        req.user!.id,
        savedFile.filePath,
        savedFile.mimeType,
        savedFile.sizeBytes
      );

      const photoRecord = db
        .prepare('SELECT * FROM item_photos WHERE id = ?')
        .get(photoId);

      res.status(201).json({
        success: true,
        data: { photo: photoRecord },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/donations
donationsRouter.get(
  '/donations',
  authenticate,
  requireRole('donor', 'admin'),
  (req, res) => {
    const db = getDb();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const isAdmin = req.user!.role === 'admin';
    const whereClause = isAdmin ? '' : 'WHERE d.donor_id = ?';
    const params = isAdmin ? [limit, offset] : [req.user!.id, limit, offset];

    const donations = db
      .prepare(
        `SELECT d.* FROM donations d
         ${whereClause}
         ORDER BY d.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params) as any[];

    const hydrated = donations.map((don) => {
      const items = db
        .prepare('SELECT * FROM donation_items WHERE donation_id = ?')
        .all(don.id)
        .map((i: any) => ({
          ...i,
          auto_check_result: i.auto_check_result ? JSON.parse(i.auto_check_result) : [],
        }));
      return { ...don, items };
    });

    res.json({
      success: true,
      data: {
        donations: hydrated,
        page,
        limit,
      },
    });
  }
);

// GET /api/v1/donations/:id
donationsRouter.get(
  '/donations/:id',
  authenticate,
  requireRole('donor', 'admin'),
  (req, res, next) => {
    try {
      const db = getDb();
      const donation = db
        .prepare('SELECT * FROM donations WHERE id = ?')
        .get(req.params.id) as any;

      if (!donation) {
        throw new AppError(404, 'NOT_FOUND', 'Donation not found');
      }
      if (req.user!.role !== 'admin' && donation.donor_id !== req.user!.id) {
        throw new AppError(403, 'FORBIDDEN', 'You can only view your own donations');
      }

      const items = db
        .prepare('SELECT * FROM donation_items WHERE donation_id = ?')
        .all(donation.id)
        .map((i: any) => ({
          ...i,
          auto_check_result: i.auto_check_result ? JSON.parse(i.auto_check_result) : [],
        }));

      res.json({
        success: true,
        data: {
          donation,
          items,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/items/:id
donationsRouter.patch(
  '/items/:id',
  authenticate,
  requireRole('donor'),
  validateBody(patchItemSchema),
  (req, res, next) => {
    try {
      const db = getDb();
      const item = db
        .prepare(
          `SELECT i.*, d.donor_id, d.declaration_sealed, d.declaration_room_temp
           FROM donation_items i
           JOIN donations d ON d.id = i.donation_id
           WHERE i.id = ?`
        )
        .get(req.params.id) as any;

      if (!item) {
        throw new AppError(404, 'NOT_FOUND', 'Item not found');
      }
      if (item.donor_id !== req.user!.id) {
        throw new AppError(403, 'FORBIDDEN', 'You can only edit your own items');
      }
      if (item.status !== 'LISTED' && item.status !== 'PENDING_REVIEW') {
        throw new AppError(
          409,
          'INVALID_STATE',
          `Item in status ${item.status} can no longer be edited`
        );
      }

      const updatedFields = {
        medicine_name: req.body.medicine_name ?? item.medicine_name,
        strength: req.body.strength !== undefined ? req.body.strength : item.strength,
        form: req.body.form ?? item.form,
        quantity: req.body.quantity ?? item.quantity,
        batch_no: req.body.batch_no !== undefined ? req.body.batch_no : item.batch_no,
        expiry_date: req.body.expiry_date !== undefined ? req.body.expiry_date : item.expiry_date,
        is_rx_only: req.body.is_rx_only !== undefined ? req.body.is_rx_only : Boolean(item.is_rx_only),
      };

      const evalRes = runEligibilityEngine(
        {
          itemId: item.id,
          medicineName: updatedFields.medicine_name,
          strength: updatedFields.strength,
          form: updatedFields.form,
          quantity: updatedFields.quantity,
          batchNo: updatedFields.batch_no,
          expiryDate: updatedFields.expiry_date,
          isRxOnly: updatedFields.is_rx_only,
          declarationSealed: Boolean(item.declaration_sealed),
          declarationRoomTemp: Boolean(item.declaration_room_temp),
          ocrConfidence: item.ocr_confidence,
        },
        db
      );

      const newStatus = evalRes.passedHardRules ? 'PENDING_REVIEW' : 'AUTO_BLOCKED';
      db.prepare(
        `UPDATE donation_items
         SET medicine_name = ?, generic_name = ?, strength = ?, form = ?,
             quantity = ?, batch_no = ?, expiry_date = ?, is_rx_only = ?,
             status = ?, auto_check_result = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        updatedFields.medicine_name,
        evalRes.genericName,
        updatedFields.strength,
        updatedFields.form,
        updatedFields.quantity,
        updatedFields.batch_no,
        updatedFields.expiry_date,
        updatedFields.is_rx_only ? 1 : 0,
        newStatus,
        JSON.stringify(evalRes.results),
        new Date().toISOString(),
        item.id
      );

      const updated = db.prepare('SELECT * FROM donation_items WHERE id = ?').get(item.id) as any;
      res.json({
        success: true,
        data: {
          item: {
            ...updated,
            auto_check_result: JSON.parse(updated.auto_check_result || '[]'),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/items/:id/cancel
donationsRouter.post(
  '/items/:id/cancel',
  authenticate,
  requireRole('donor'),
  (req, res, next) => {
    try {
      const db = getDb();
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
      if (item.donor_id !== req.user!.id) {
        throw new AppError(403, 'FORBIDDEN', 'You can only cancel your own items');
      }

      const tx = db.transaction(() => {
        db.prepare(
          `UPDATE matches SET status = 'cancelled', updated_at = ?
           WHERE item_id = ? AND status = 'suggested'`
        ).run(new Date().toISOString(), item.id);

        transitionItemStatus(
          {
            itemId: item.id,
            toStatus: 'CANCELLED',
            actorId: req.user!.id,
            actorRole: req.user!.role,
            requestId: req.requestId,
          },
          db
        );
      });

      tx();

      const updated = db.prepare('SELECT * FROM donation_items WHERE id = ?').get(item.id);
      res.json({
        success: true,
        data: { item: updated },
      });
    } catch (err) {
      next(err);
    }
  }
);
