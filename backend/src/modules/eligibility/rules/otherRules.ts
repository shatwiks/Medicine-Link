import { EligibilityRuleFn } from '../types';

export const sealedDeclaredRule: EligibilityRuleFn = (ctx) => ({
  rule: 'SEALED_DECLARED',
  passed: Boolean(ctx.declarationSealed),
  severity: 'hard',
  message: ctx.declarationSealed
    ? 'Donor declared the pack is sealed and unopened.'
    : 'Only sealed and unopened medicine packs can be accepted.',
});

export const roomTempDeclaredRule: EligibilityRuleFn = (ctx) => ({
  rule: 'ROOM_TEMP_DECLARED',
  passed: Boolean(ctx.declarationRoomTemp),
  severity: 'hard',
  message: ctx.declarationRoomTemp
    ? 'Donor declared safe room-temperature storage.'
    : 'Donor must confirm room-temperature storage.',
});

export const formAllowedRule: EligibilityRuleFn = (ctx) => {
  const allowedForms = ['tablet', 'capsule', 'syrup', 'ointment', 'drops', 'inhaler', 'powder', 'other'];
  const lowerMed = ctx.medicineName.toLowerCase();
  const isInjectable =
    ctx.form === 'injectable' ||
    lowerMed.includes('injection') ||
    lowerMed.includes('vial') ||
    lowerMed.includes('ampoule');
  const passed = allowedForms.includes(ctx.form) && !isInjectable;

  return {
    rule: 'FORM_ALLOWED',
    passed,
    severity: 'hard',
    message: passed
      ? `Dosage form (${ctx.form}) is allowed.`
      : 'Injectable, cold-chain, or parenteral dosage forms are not accepted.',
  };
};

export const notBlockedRule: EligibilityRuleFn = (ctx) => {
  const combined = `${ctx.medicineName} ${ctx.genericName}`.toLowerCase();
  const matched = ctx.blockedKeywords.find((b) =>
    combined.includes(b.keyword.toLowerCase())
  );
  const passed = !matched;
  return {
    rule: 'NOT_BLOCKED',
    passed,
    severity: 'hard',
    message: passed
      ? 'Medicine is not on the blocked controlled/cold-chain list.'
      : `Blocked (${matched?.category}): ${matched?.reason} (${matched?.keyword}).`,
  };
};

export const batchPresentRule: EligibilityRuleFn = (ctx) => {
  const passed = Boolean(ctx.batchNo && ctx.batchNo.trim().length > 0);
  return {
    rule: 'BATCH_PRESENT',
    passed,
    severity: 'hard',
    message: passed
      ? `Batch number (${ctx.batchNo}) is present.`
      : 'Batch number is required for medicine traceability.',
  };
};

export const expiryPresentRule: EligibilityRuleFn = (ctx) => {
  const validFormat = Boolean(
    ctx.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(ctx.expiryDate)
  );
  return {
    rule: 'EXPIRY_PRESENT',
    passed: validFormat,
    severity: 'hard',
    message: validFormat
      ? `Expiry date (${ctx.expiryDate}) is present and valid.`
      : 'A valid expiry date (YYYY-MM-DD) is required.',
  };
};

export const lowOcrConfidenceRule: EligibilityRuleFn = (ctx) => {
  const conf = ctx.ocrConfidence ?? 1;
  const passed = conf >= ctx.settings.ocrLowConfidence;
  return {
    rule: 'LOW_OCR_CONFIDENCE',
    passed,
    severity: 'soft',
    message: passed
      ? `OCR confidence (${Math.round(conf * 100)}%) is sufficient.`
      : `Low OCR confidence (${Math.round(conf * 100)}%). Flagged for visual pharmacist review.`,
  };
};

export const rxOnlyRule: EligibilityRuleFn = (ctx) => ({
  rule: 'RX_ONLY',
  passed: !ctx.isRxOnly,
  severity: 'soft',
  message: ctx.isRxOnly
    ? 'Prescription-only medicine: requires prescription verification at dispensing.'
    : 'Not flagged as prescription-only.',
});

export const duplicateBatchRule: EligibilityRuleFn = (ctx) => ({
  rule: 'DUPLICATE_BATCH',
  passed: !ctx.isDuplicateBatch,
  severity: 'soft',
  message: ctx.isDuplicateBatch
    ? 'Same batch number and medicine already listed earlier.'
    : 'No duplicate batch number found.',
});

export const quantityUnusualRule: EligibilityRuleFn = (ctx) => {
  const passed = ctx.quantity <= ctx.settings.quantityUnusualLimit;
  return {
    rule: 'QUANTITY_UNUSUAL',
    passed,
    severity: 'soft',
    message: passed
      ? `Quantity (${ctx.quantity}) is within normal household limits.`
      : `Quantity (${ctx.quantity}) exceeds usual limit (${ctx.settings.quantityUnusualLimit}); flagged for pharmacist review.`,
  };
};
