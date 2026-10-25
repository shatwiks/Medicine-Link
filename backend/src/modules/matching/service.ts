import crypto from 'crypto';
import { getDb, SqliteDatabase } from '../../db/connection';
import { AppError } from '../../utils/errors';
import { haversineDistanceKm } from '../../utils/haversine';
import { writeAuditLog } from '../audit/service';
import { transitionItemStatus } from '../donations/stateMachine';
import { loadEligibilitySettings } from '../eligibility/engine';
import { createNotification } from '../notifications/service';

export interface ScoreBreakdown {
  medicine_score: number;
  distance_score: number;
  distance_km: number;
  urgency_score: number;
  total: number;
}

export function calculateMatchScore(params: {
  itemGenericName: string;
  itemStrength?: string | null;
  donorLat?: number | null;
  donorLng?: number | null;
  needGenericName: string;
  needStrength?: string | null;
  orgLat?: number | null;
  orgLng?: number | null;
  urgency: 'low' | 'medium' | 'high';
  maxDistanceKm: number;
}): ScoreBreakdown | null {
  if (
    params.itemGenericName.trim().toLowerCase() !==
    params.needGenericName.trim().toLowerCase()
  ) {
    return null;
  }

  const normStrength = (s?: string | null) =>
    (s || '').toLowerCase().replace(/\s+/g, '');
  const sameStrength =
    Boolean(params.itemStrength && params.needStrength) &&
    normStrength(params.itemStrength) === normStrength(params.needStrength);
  const medicine_score = sameStrength ? 50 : 20;

  let distance_km = 2.0;
  if (
    params.donorLat != null &&
    params.donorLng != null &&
    params.orgLat != null &&
    params.orgLng != null
  ) {
    distance_km = haversineDistanceKm(
      params.donorLat,
      params.donorLng,
      params.orgLat,
      params.orgLng
    );
  }

  if (distance_km > params.maxDistanceKm) {
    return null;
  }

  let distance_score = 12;
  if (distance_km <= 3) {
    distance_score = 30;
  } else if (distance_km <= 10) {
    distance_score = 22;
  }

  const urgencyMap: Record<'low' | 'medium' | 'high', number> = {
    high: 20,
    medium: 12,
    low: 5,
  };
  const urgency_score = urgencyMap[params.urgency] ?? 12;

  return {
    medicine_score,
    distance_score,
    distance_km,
    urgency_score,
    total: medicine_score + distance_score + urgency_score,
  };
}

export function runMatchingForItem(
  itemId: string,
  db: SqliteDatabase = getDb()
): number {
  const item = db
    .prepare(
      `SELECT i.*, d.lat AS donor_lat, d.lng AS donor_lng
       FROM donation_items i
       JOIN donations d ON d.id = i.donation_id
       WHERE i.id = ?`
    )
    .get(itemId) as any;

  if (!item || (item.status !== 'APPROVED' && item.status !== 'MATCHED')) {
    return 0;
  }

  const settings = loadEligibilitySettings(db);

  // Exclude needs that already have a match record for this item
  const existingMatches = db
    .prepare('SELECT need_id, org_id, status FROM matches WHERE item_id = ?')
    .all(itemId) as { need_id: string; org_id: string; status: string }[];
  const excludedNeedIds = new Set(existingMatches.map((m) => m.need_id));
  const declinedOrgIds = new Set(
    existingMatches.filter((m) => m.status === 'declined').map((m) => m.org_id)
  );

  const candidateNeeds = db
    .prepare(
      `SELECT n.*, o.lat AS org_lat, o.lng AS org_lng, o.name AS org_name
       FROM needs n
       JOIN organizations o ON o.id = n.org_id
       WHERE n.status IN ('open','partially_fulfilled')
         AND n.quantity_remaining > 0
         AND o.verified = 1
         AND n.generic_name = ? COLLATE NOCASE`
    )
    .all(item.generic_name || '') as any[];

  const scoredCandidates: {
    need: any;
    score: number;
    breakdown: ScoreBreakdown;
  }[] = [];

  for (const need of candidateNeeds) {
    if (excludedNeedIds.has(need.id) || declinedOrgIds.has(need.org_id)) continue;

    const breakdown = calculateMatchScore({
      itemGenericName: item.generic_name || '',
      itemStrength: item.strength,
      donorLat: item.donor_lat,
      donorLng: item.donor_lng,
      needGenericName: need.generic_name || '',
      needStrength: need.strength,
      orgLat: need.org_lat,
      orgLng: need.org_lng,
      urgency: need.urgency,
      maxDistanceKm: settings.maxDistanceKm,
    });

    if (breakdown) {
      scoredCandidates.push({
        need,
        score: breakdown.total,
        breakdown,
      });
    }
  }

  scoredCandidates.sort((a, b) => b.score - a.score);
  const top3 = scoredCandidates.slice(0, 3);

  if (top3.length === 0) return 0;

  const expiresAt = new Date(
    Date.now() + settings.matchExpiryHours * 3600 * 1000
  ).toISOString();

  const tx = db.transaction(() => {
    for (const cand of top3) {
      const matchId = crypto.randomUUID();
      const allocated = Math.min(item.quantity, cand.need.quantity_remaining);

      db.prepare(
        `INSERT INTO matches (
          id, item_id, need_id, org_id, score, score_breakdown,
          quantity_allocated, status, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'suggested', ?)`
      ).run(
        matchId,
        item.id,
        cand.need.id,
        cand.need.org_id,
        cand.score,
        JSON.stringify(cand.breakdown),
        allocated,
        expiresAt
      );

      // Notify NGO users of that organization
      const orgUsers = db
        .prepare('SELECT id FROM users WHERE org_id = ? AND is_active = 1')
        .all(cand.need.org_id) as { id: string }[];
      for (const u of orgUsers) {
        createNotification(
          {
            userId: u.id,
            type: 'NEW_MATCH',
            message: `New match (${cand.score}/100) for ${item.medicine_name}`,
            entity: 'match',
            entityId: matchId,
          },
          db
        );
      }
    }

    if (item.status === 'APPROVED') {
      transitionItemStatus(
        {
          itemId: item.id,
          toStatus: 'MATCHED',
          actorRole: 'system',
          details: { suggestionsCreated: top3.length },
        },
        db
      );
    }
  });

  tx();
  return top3.length;
}

export function runMatchingForNeed(
  needId: string,
  db: SqliteDatabase = getDb()
): number {
  const need = db.prepare('SELECT * FROM needs WHERE id = ?').get(needId) as any;
  if (!need) return 0;

  const approvedItems = db
    .prepare(
      `SELECT id FROM donation_items
       WHERE status IN ('APPROVED','MATCHED')
         AND generic_name = ? COLLATE NOCASE`
    )
    .all(need.generic_name || '') as { id: string }[];

  let totalCreated = 0;
  for (const itm of approvedItems) {
    totalCreated += runMatchingForItem(itm.id, db);
  }
  return totalCreated;
}

export function respondToMatchSuggestion(
  params: {
    matchId: string;
    response: 'accept' | 'decline';
    actorId: string;
    actorRole: string;
    actorOrgId?: string | null;
    requestId?: string | null;
  },
  db: SqliteDatabase = getDb()
): any {
  const match = db
    .prepare('SELECT * FROM matches WHERE id = ?')
    .get(params.matchId) as any;

  if (!match) {
    throw new AppError(404, 'NOT_FOUND', 'Match suggestion not found');
  }

  if (params.actorRole !== 'admin' && match.org_id !== params.actorOrgId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only respond to matches for your own organisation');
  }

  if (match.status !== 'suggested') {
    throw new AppError(
      409,
      'INVALID_STATE',
      `Match is already ${match.status} and cannot be responded to`
    );
  }

  const now = new Date().toISOString();

  if (params.response === 'accept') {
    try {
      const tx = db.transaction(() => {
        // Set match accepted (will throw SQLITE_CONSTRAINT_UNIQUE if another match for this item was already accepted)
        db.prepare(
          `UPDATE matches
           SET status = 'accepted', responded_at = ?, updated_at = ?
           WHERE id = ?`
        ).run(now, now, match.id);

        // Cancel other suggestions for the same item
        db.prepare(
          `UPDATE matches
           SET status = 'cancelled', updated_at = ?
           WHERE item_id = ? AND id <> ? AND status = 'suggested'`
        ).run(now, match.item_id, match.id);

        // Reduce need quantity_remaining
        const need = db
          .prepare('SELECT * FROM needs WHERE id = ?')
          .get(match.need_id) as any;
        const newRem = Math.max(0, need.quantity_remaining - match.quantity_allocated);
        const newNeedStatus = newRem === 0 ? 'fulfilled' : 'partially_fulfilled';

        db.prepare(
          `UPDATE needs
           SET quantity_remaining = ?, status = ?, updated_at = ?
           WHERE id = ?`
        ).run(newRem, newNeedStatus, now, need.id);

        // Transition item to ACCEPTED
        transitionItemStatus(
          {
            itemId: match.item_id,
            toStatus: 'ACCEPTED',
            actorId: params.actorId,
            actorRole: params.actorRole,
            requestId: params.requestId,
            details: { matchId: match.id, orgId: match.org_id },
          },
          db
        );

        writeAuditLog(
          {
            actorId: params.actorId,
            actorRole: params.actorRole,
            action: 'MATCH_ACCEPTED',
            entity: 'match',
            entityId: match.id,
            details: { itemId: match.item_id, needId: match.need_id },
            requestId: params.requestId,
          },
          db
        );
      });

      tx();
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (String(err?.message || '').includes('UNIQUE constraint failed')) {
        throw new AppError(
          409,
          'INVALID_STATE',
          'Another organisation already accepted this item first'
        );
      }
      throw err;
    }
  } else {
    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE matches
         SET status = 'declined', responded_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(now, now, match.id);

      writeAuditLog(
        {
          actorId: params.actorId,
          actorRole: params.actorRole,
          action: 'MATCH_DECLINED',
          entity: 'match',
          entityId: match.id,
          details: { itemId: match.item_id },
          requestId: params.requestId,
        },
        db
      );

      const remainingSuggestions = db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM matches
           WHERE item_id = ? AND status = 'suggested'`
        )
        .get(match.item_id) as { cnt: number };

      if ((remainingSuggestions?.cnt ?? 0) === 0) {
        const currentItem = db
          .prepare('SELECT status FROM donation_items WHERE id = ?')
          .get(match.item_id) as { status: string };
        if (currentItem?.status === 'MATCHED') {
          transitionItemStatus(
            {
              itemId: match.item_id,
              toStatus: 'APPROVED',
              actorId: params.actorId,
              actorRole: params.actorRole,
              details: { reason: 'All suggestions declined' },
            },
            db
          );
          // Re-run matching excluding declined org
          runMatchingForItem(match.item_id, db);
        }
      }
    });

    tx();
  }

  return db.prepare('SELECT * FROM matches WHERE id = ?').get(match.id);
}
