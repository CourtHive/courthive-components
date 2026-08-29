import { describe, it, expect } from 'vitest';

import { formatFeeRange } from '../feeFormatter';

const USD = 'USD';
const EUR = 'EUR';
const MAJOR = 'MAJOR';
const SIXTY_USD_FORMATTED = 'USD $60.00';

/**
 * Two assertions in this file changed with the entry-fee unit work, and both changed because the
 * behaviour they pinned was a defect:
 *
 *  - "defaults to USD when currencyCode missing" — inventing a currency. Now returns null.
 *  - "formats mixed currencies … using the minimum" — picked the smaller NUMBER across currencies
 *    (40 EUR over 85 USD), which is a comparison of two things that are not comparable.
 *
 * Every other case is unchanged apart from stating `unit`, which is now required to place an amount
 * on a scale.
 */
describe('formatFeeRange', () => {
  it('returns null when no fees', () => {
    expect(formatFeeRange(undefined)).toBeNull();
    expect(formatFeeRange(null)).toBeNull();
    expect(formatFeeRange([])).toBeNull();
  });

  it('returns null when all fees lack numeric amounts', () => {
    expect(formatFeeRange([{ amount: NaN, currencyCode: USD, unit: MAJOR }])).toBeNull();
  });

  it('formats a single fee with currency code prefix', () => {
    expect(formatFeeRange([{ amount: 60, currencyCode: USD, unit: MAJOR }])).toBe(SIXTY_USD_FORMATTED);
  });

  it('returns null when currencyCode is missing — a currency is never invented', () => {
    // Previously defaulted to USD. An absent currency is unknown, not American.
    expect(formatFeeRange([{ amount: 60, unit: MAJOR }])).toBeNull();
  });

  it('returns null when unit is missing — the scale cannot be guessed', () => {
    // 6000 is $60.00 in minor units and $6,000 in major. Rendering either is a coin flip.
    expect(formatFeeRange([{ amount: 6000, currencyCode: USD }])).toBeNull();
  });

  it('renders minor units at the right scale', () => {
    expect(formatFeeRange([{ amount: 6000, currencyCode: USD, unit: 'MINOR' }])).toBe(SIXTY_USD_FORMATTED);
  });

  it('uses the currency-specific minor exponent, not a hardcoded 100', () => {
    // JPY has no minor unit: 6000 JPY minor is 6000 JPY, not 60.
    expect(formatFeeRange([{ amount: 6000, currencyCode: 'JPY', unit: 'MINOR' }])).toContain('6,000');
  });

  it('formats multiple fees of the same currency as a range', () => {
    const out = formatFeeRange([
      { amount: 85, currencyCode: USD, unit: MAJOR },
      { amount: 40, currencyCode: USD, unit: MAJOR },
      { amount: 60, currencyCode: USD, unit: MAJOR }
    ]);
    expect(out).toBe('USD $40.00 – $85.00');
  });

  it('collapses to single value when all fees equal', () => {
    const out = formatFeeRange([
      { amount: 60, currencyCode: USD, unit: MAJOR },
      { amount: 60, currencyCode: USD, unit: MAJOR }
    ]);
    expect(out).toBe(SIXTY_USD_FORMATTED);
  });

  it('does not pick the smaller number across currencies', () => {
    // Previously returned "From EUR €40.00" — 40 EUR is a smaller NUMBER than 85 USD but not a
    // known smaller VALUE. The floor is now stated within the denomination actually being read.
    const out = formatFeeRange([
      { amount: 85, currencyCode: USD, unit: MAJOR },
      { amount: 90, currencyCode: USD, unit: MAJOR },
      { amount: 40, currencyCode: EUR, unit: MAJOR }
    ]);
    expect(out).toContain('From USD');
    expect(out).not.toContain('EUR');
  });
});
