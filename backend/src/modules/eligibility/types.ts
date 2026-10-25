export interface RuleEvaluationContext {
  itemId?: string;
  medicineName: string;
  genericName: string;
  strength?: string | null;
  form: string;
  quantity: number;
  batchNo?: string | null;
  expiryDate?: string | null;
  isRxOnly: boolean;
  declarationSealed: boolean;
  declarationRoomTemp: boolean;
  ocrConfidence?: number | null;
  settings: {
    minShelfLifeMonths: number;
    ocrLowConfidence: number;
    quantityUnusualLimit: number;
  };
  blockedKeywords: { keyword: string; category: string; reason: string }[];
  isDuplicateBatch: boolean;
}

export interface RuleResult {
  rule: string;
  passed: boolean;
  severity: 'hard' | 'soft';
  message: string;
}

export type EligibilityRuleFn = (ctx: RuleEvaluationContext) => RuleResult;
