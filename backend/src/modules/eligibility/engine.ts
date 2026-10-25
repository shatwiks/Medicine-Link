import { getDb, SqliteDatabase } from '../../db/connection';
import { minShelfLifeRule } from './rules/minShelfLife';
import { notExpiredRule } from './rules/notExpired';
import {
  batchPresentRule,
  duplicateBatchRule,
  expiryPresentRule,
  formAllowedRule,
  lowOcrConfidenceRule,
  notBlockedRule,
  quantityUnusualRule,
  roomTempDeclaredRule,
  rxOnlyRule,
  sealedDeclaredRule,
} from './rules/otherRules';
import { EligibilityRuleFn, RuleEvaluationContext, RuleResult } from './types';

export const ELIGIBILITY_RULES_REGISTRY: EligibilityRuleFn[] = [
  minShelfLifeRule,
  notExpiredRule,
  sealedDeclaredRule,
  roomTempDeclaredRule,
  formAllowedRule,
  notBlockedRule,
  batchPresentRule,
  expiryPresentRule,
  lowOcrConfidenceRule,
  rxOnlyRule,
  duplicateBatchRule,
  quantityUnusualRule,
];

export function resolveGenericMedicineName(
  medicineName: string,
  db: SqliteDatabase = getDb()
): string {
  const cleaned = medicineName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');

  const aliases = db
    .prepare('SELECT alias, generic_name FROM medicine_aliases')
    .all() as { alias: string; generic_name: string }[];

  for (const row of aliases) {
    if (cleaned === row.alias.toLowerCase() || cleaned.includes(row.alias.toLowerCase())) {
      return row.generic_name.toLowerCase();
    }
  }

  return cleaned.split(' ')[0] || cleaned;
}

export function loadEligibilitySettings(db: SqliteDatabase = getDb()) {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    minShelfLifeMonths: Number(map.get('min_shelf_life_months') ?? 6),
    ocrLowConfidence: Number(map.get('ocr_low_confidence') ?? 0.6),
    quantityUnusualLimit: Number(map.get('quantity_unusual_limit') ?? 100),
    matchExpiryHours: Number(map.get('match_expiry_hours') ?? 48),
    maxDistanceKm: Number(map.get('max_distance_km') ?? 25),
    photoRetentionDays: Number(map.get('photo_retention_days') ?? 90),
  };
}

export function runEligibilityEngine(
  input: {
    itemId?: string;
    medicineName: string;
    strength?: string | null;
    form: string;
    quantity: number;
    batchNo?: string | null;
    expiryDate?: string | null;
    isRxOnly: boolean;
    declarationSealed: boolean;
    declarationRoomTemp: boolean;
    ocrConfidence?: number | null;
  },
  db: SqliteDatabase = getDb()
): {
  genericName: string;
  passedHardRules: boolean;
  results: RuleResult[];
} {
  const genericName = resolveGenericMedicineName(input.medicineName, db);
  const settings = loadEligibilitySettings(db);
  const blockedKeywords = db
    .prepare('SELECT keyword, category, reason FROM blocked_medicines')
    .all() as { keyword: string; category: string; reason: string }[];

  let isDuplicateBatch = false;
  if (input.batchNo && input.batchNo.trim().length > 0) {
    const dupRow = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM donation_items
         WHERE batch_no = ? AND medicine_name = ? COLLATE NOCASE AND id <> ?`
      )
      .get(input.batchNo.trim(), input.medicineName.trim(), input.itemId || '') as {
      cnt: number;
    };
    isDuplicateBatch = (dupRow?.cnt ?? 0) > 0;
  }

  const ctx: RuleEvaluationContext = {
    itemId: input.itemId,
    medicineName: input.medicineName,
    genericName,
    strength: input.strength,
    form: input.form,
    quantity: input.quantity,
    batchNo: input.batchNo,
    expiryDate: input.expiryDate,
    isRxOnly: input.isRxOnly,
    declarationSealed: input.declarationSealed,
    declarationRoomTemp: input.declarationRoomTemp,
    ocrConfidence: input.ocrConfidence,
    settings,
    blockedKeywords,
    isDuplicateBatch,
  };

  const results = ELIGIBILITY_RULES_REGISTRY.map((ruleFn) => ruleFn(ctx));
  const passedHardRules = results
    .filter((r) => r.severity === 'hard')
    .every((r) => r.passed);

  return {
    genericName,
    passedHardRules,
    results,
  };
}
