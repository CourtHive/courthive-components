import { describe, it, expect } from 'vitest';

import { formatFeeRange } from '../feeFormatter';

const USD = 'USD';
const EUR = 'EUR';
const SIXTY_USD_FORMATTED = 'USD $60.00';

describe('formatFeeRange', () => {
  it('returns null when no fees', () => {
    expect(formatFeeRange(undefined)).toBeNull();
    expect(formatFeeRange(null)).toBeNull();
    expect(formatFeeRange([])).toBeNull();
  });

  it('returns null when all fees lack numeric amounts', () => {
    expect(formatFeeRange([{ amount: NaN, currencyCode: USD }])).toBeNull();
  });

  it('formats a single fee with currency code prefix', () => {
    expect(formatFeeRange([{ amount: 60, currencyCode: USD }])).toBe(SIXTY_USD_FORMATTED);
  });

  it('defaults to USD when currencyCode missing', () => {
    expect(formatFeeRange([{ amount: 60 }])).toBe(SIXTY_USD_FORMATTED);
  });

  it('formats multiple fees of the same currency as a range', () => {
    const out = formatFeeRange([
      { amount: 85, currencyCode: USD },
      { amount: 40, currencyCode: USD },
      { amount: 60, currencyCode: USD }
    ]);
    expect(out).toBe('USD $40.00 – $85.00');
  });

  it('collapses to single value when all fees equal', () => {
    const out = formatFeeRange([
      { amount: 60, currencyCode: USD },
      { amount: 60, currencyCode: USD }
    ]);
    expect(out).toBe(SIXTY_USD_FORMATTED);
  });

  it('formats mixed currencies as a "From" badge using the minimum', () => {
    const out = formatFeeRange([
      { amount: 85, currencyCode: USD },
      { amount: 40, currencyCode: EUR }
    ]);
    expect(out).toContain('From EUR');
    expect(out).toContain('40');
  });
});
