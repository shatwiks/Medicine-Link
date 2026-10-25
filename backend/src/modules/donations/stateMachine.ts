import { getDb, SqliteDatabase } from '../../db/connection';
import { AppError } from '../../utils/errors';
import { writeAuditLog } from '../audit/service';

export type ItemStatus =
  | 'LISTED'
  | 'AUTO_BLOCKED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'EXPIRED';

const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  LISTED: ['AUTO_BLOCKED', 'PENDING_REVIEW', 'CANCELLED'],
  AUTO_BLOCKED: [],
  PENDING_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['MATCHED', 'CANCELLED', 'EXPIRED'],
  REJECTED: [],
  MATCHED: ['APPROVED', 'ACCEPTED', 'CANCELLED', 'EXPIRED'],
  ACCEPTED: ['PICKUP_SCHEDULED'],
  PICKUP_SCHEDULED: ['PICKED_UP'],
  PICKED_UP: ['DELIVERED'],
  DELIVERED: ['RECEIVED'],
  RECEIVED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const FINAL_ITEM_STATUSES: ItemStatus[] = [
  'RECEIVED',
  'REJECTED',
  'AUTO_BLOCKED',
  'CANCELLED',
  'EXPIRED',
];

export function canTransitionItemStatus(from: ItemStatus, to: ItemStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionItemStatus(
  params: {
    itemId: string;
    toStatus: ItemStatus;
    actorId?: string | null;
    actorRole?: string | null;
    requestId?: string | null;
    details?: Record<string, unknown>;
    extraFields?: {
      reviewerId?: string;
      reviewedAt?: string;
      rejectReasonCode?: string | null;
      rejectNote?: string | null;
      verificationCode?: string | null;
    };
  },
  db: SqliteDatabase = getDb()
): void {
  const tx = db.transaction(() => {
    const item = db
      .prepare('SELECT id, donation_id, status FROM donation_items WHERE id = ?')
      .get(params.itemId) as { id: string; donation_id: string; status: ItemStatus } | undefined;

    if (!item) {
      throw new AppError(404, 'NOT_FOUND', `Donation item ${params.itemId} not found`);
    }

    if (!canTransitionItemStatus(item.status, params.toStatus)) {
      throw new AppError(
        409,
        'INVALID_STATE',
        `Transition from ${item.status} to ${params.toStatus} is not allowed`
      );
    }

    const now = new Date().toISOString();

    if (params.extraFields) {
      db.prepare(
        `UPDATE donation_items
         SET status = ?,
             reviewer_id = COALESCE(?, reviewer_id),
             reviewed_at = COALESCE(?, reviewed_at),
             reject_reason_code = COALESCE(?, reject_reason_code),
             reject_note = COALESCE(?, reject_note),
             verification_code = COALESCE(?, verification_code),
             updated_at = ?
         WHERE id = ?`
      ).run(
        params.toStatus,
        params.extraFields.reviewerId ?? null,
        params.extraFields.reviewedAt ?? null,
        params.extraFields.rejectReasonCode ?? null,
        params.extraFields.rejectNote ?? null,
        params.extraFields.verificationCode ?? null,
        now,
        params.itemId
      );
    } else {
      db.prepare(
        'UPDATE donation_items SET status = ?, updated_at = ? WHERE id = ?'
      ).run(params.toStatus, now, params.itemId);
    }

    // Recalculate parent donation status
    recalculateDonationStatus(item.donation_id, db);

    writeAuditLog(
      {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: `ITEM_STATUS_${params.toStatus}`,
        entity: 'donation_item',
        entityId: params.itemId,
        details: {
          from: item.status,
          to: params.toStatus,
          ...(params.details || {}),
        },
        requestId: params.requestId,
      },
      db
    );
  });

  tx();
}

export function recalculateDonationStatus(
  donationId: string,
  db: SqliteDatabase = getDb()
): void {
  const rows = db
    .prepare('SELECT status FROM donation_items WHERE donation_id = ?')
    .all(donationId) as { status: ItemStatus }[];

  if (rows.length === 0) return;

  const allCancelled = rows.every((r) => r.status === 'CANCELLED');
  const allFinal = rows.every((r) => FINAL_ITEM_STATUSES.includes(r.status));

  const nextDonationStatus = allCancelled
    ? 'cancelled'
    : allFinal
    ? 'completed'
    : 'open';

  db.prepare('UPDATE donations SET status = ?, updated_at = ? WHERE id = ?').run(
    nextDonationStatus,
    new Date().toISOString(),
    donationId
  );
}
