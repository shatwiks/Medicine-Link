import { monthsUntilExpiry } from '../../../utils/dates';
import { EligibilityRuleFn } from '../types';

export const notExpiredRule: EligibilityRuleFn = (ctx) => {
  if (!ctx.expiryDate) {
    return {
      rule: 'NOT_EXPIRED',
      passed: false,
      severity: 'hard',
      message: 'Cannot verify expiry because expiry date is missing.',
    };
  }
  const months = monthsUntilExpiry(ctx.expiryDate);
  const passed = months > 0;
  return {
    rule: 'NOT_EXPIRED',
    passed,
    severity: 'hard',
    message: passed
      ? 'Expiry date is in the future.'
      : 'This medicine pack has already expired and cannot be donated.',
  };
};
