import { monthsUntilExpiry } from '../../../utils/dates';
import { EligibilityRuleFn } from '../types';

export const minShelfLifeRule: EligibilityRuleFn = (ctx) => {
  if (!ctx.expiryDate) {
    return {
      rule: 'MIN_SHELF_LIFE',
      passed: false,
      severity: 'hard',
      message: `Expiry date is required to verify the minimum ${ctx.settings.minShelfLifeMonths}-month shelf life.`,
    };
  }
  const months = monthsUntilExpiry(ctx.expiryDate);
  const passed = months >= ctx.settings.minShelfLifeMonths - 0.15;
  return {
    rule: 'MIN_SHELF_LIFE',
    passed,
    severity: 'hard',
    message: passed
      ? `Remaining shelf life (${Math.round(months * 10) / 10} months) meets the ${ctx.settings.minShelfLifeMonths}-month minimum.`
      : `This pack expires in ${Math.max(0, Math.round(months * 10) / 10)} months. We need at least ${ctx.settings.minShelfLifeMonths} months so it stays useful.`,
  };
};
