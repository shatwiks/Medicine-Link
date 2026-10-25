import cron from 'node-cron';
import { getDb, SqliteDatabase } from '../db/connection';
import { transitionItemStatus } from '../modules/donations/stateMachine';
import { loadEligibilitySettings } from '../modules/eligibility/engine';
import { runMatchingForItem } from '../modules/matching/service';
import { createNotification, notifyRoleUsers } from '../modules/notifications/service';
import { monthsUntilExpiry } from '../utils/dates';
import { logger } from '../utils/logger';

export function runExpiryCheckJob(db: SqliteDatabase = getDb()): number {
  const settings = loadEligibilitySettings(db);
  const candidates = db
    .prepare(
      `SELECT i.id, i.medicine_name, i.expiry_date, d.donor_id
       FROM donation_items i
       JOIN donations d ON d.id = i.donation_id
       WHERE i.status IN ('APPROVED','MATCHED')`
    )
    .all() as {
    id: string;
    medicine_name: string;
    expiry_date: string | null;
    donor_id: string;
  }[];

  let expiredCount = 0;
  const nowStr = new Date().toISOString();

  for (const item of candidates) {
    if (!item.expiry_date) continue;
    const monthsLeft = monthsUntilExpiry(item.expiry_date);
    if (monthsLeft < settings.minShelfLifeMonths) {
      const tx = db.transaction(() => {
        db.prepare(
          `UPDATE matches SET status = 'cancelled', updated_at = ?
           WHERE item_id = ? AND status = 'suggested'`
        ).run(nowStr, item.id);

        transitionItemStatus(
          {
            itemId: item.id,
            toStatus: 'EXPIRED',
            actorRole: 'system',
            details: { monthsLeft, minRequired: settings.minShelfLifeMonths },
          },
          db
        );

        createNotification(
          {
            userId: item.donor_id,
            type: 'ITEM_EXPIRED',
            message: `${item.medicine_name} dropped below the minimum ${settings.minShelfLifeMonths}-month shelf life threshold and was marked EXPIRED.`,
            entity: 'donation_item',
            entityId: item.id,
          },
          db
        );
      });
      tx();
      expiredCount++;
    }
  }

  logger.info({ expiredCount }, 'Completed daily expiry check job');
  return expiredCount;
}

export function runMatchExpiryJob(db: SqliteDatabase = getDb()): number {
  const nowStr = new Date().toISOString();
  const expiredMatches = db
    .prepare(
      `SELECT id, item_id FROM matches
       WHERE status = 'suggested' AND expires_at IS NOT NULL AND expires_at < ?`
    )
    .all(nowStr) as { id: string; item_id: string }[];

  if (expiredMatches.length === 0) return 0;

  const affectedItems = new Set<string>();
  const tx = db.transaction(() => {
    for (const m of expiredMatches) {
      db.prepare(`UPDATE matches SET status = 'expired', updated_at = ? WHERE id = ?`).run(
        nowStr,
        m.id
      );
      affectedItems.add(m.item_id);
    }

    for (const itemId of affectedItems) {
      const openCount = db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM matches WHERE item_id = ? AND status = 'suggested'`
        )
        .get(itemId) as { cnt: number };

      if ((openCount?.cnt ?? 0) === 0) {
        const item = db
          .prepare('SELECT status FROM donation_items WHERE id = ?')
          .get(itemId) as { status: string } | undefined;
        if (item?.status === 'MATCHED') {
          transitionItemStatus(
            {
              itemId,
              toStatus: 'APPROVED',
              actorRole: 'system',
              details: { reason: 'Suggested matches expired' },
            },
            db
          );
          runMatchingForItem(itemId, db);
        }
      }
    }
  });

  tx();
  logger.info({ expiredMatches: expiredMatches.length }, 'Completed hourly match expiry job');
  return expiredMatches.length;
}

export function runStaleReviewReminderJob(db: SqliteDatabase = getDb()): number {
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const stale = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM donation_items
       WHERE status = 'PENDING_REVIEW' AND created_at < ?`
    )
    .get(cutoff) as { cnt: number };

  const count = stale?.cnt ?? 0;
  if (count > 0) {
    notifyRoleUsers(
      'pharmacist',
      'STALE_REVIEW_REMINDER',
      `${count} donation item(s) have been waiting in PENDING_REVIEW for over 48 hours.`,
      'donation_item',
      undefined,
      db
    );
  }
  return count;
}

export function runCleanupJob(db: SqliteDatabase = getDb()): number {
  const nowStr = new Date().toISOString();
  const res = db
    .prepare(
      `DELETE FROM refresh_tokens WHERE revoked_at IS NOT NULL OR expires_at < ?`
    )
    .run(nowStr);
  return Number(res.changes || 0);
}

export function startScheduledJobs(): void {
  // Daily at 00:30
  cron.schedule('30 0 * * *', () => {
    runExpiryCheckJob();
    runStaleReviewReminderJob();
  });

  // Hourly match expiry
  cron.schedule('0 * * * *', () => {
    runMatchExpiryJob();
  });

  // Weekly cleanup
  cron.schedule('0 2 * * 0', () => {
    runCleanupJob();
  });
}
