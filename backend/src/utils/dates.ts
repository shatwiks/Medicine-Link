export function addMonthsToDateString(months: number, baseDate: Date = new Date()): string {
  const d = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + months, 15));
  return d.toISOString().slice(0, 10);
}

export function addDaysToDateString(days: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getTime() + days * 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export function monthsUntilExpiry(expiryDate: string, now: Date = new Date()): number {
  const [y, m, d] = expiryDate.split('-').map(Number);
  if (!y || !m || !d) return -1;
  const expUtc = Date.UTC(y, m - 1, d);
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = (expUtc - nowUtc) / (1000 * 60 * 60 * 24);
  return Math.round((diffDays / 30.4375) * 100) / 100;
}
