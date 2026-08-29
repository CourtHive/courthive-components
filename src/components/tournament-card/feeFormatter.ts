/**
 * Tournament Card — Fee Formatting
 *
 * Formats `registrationProfile.entryFees[]` into a single badge string:
 *  - 0 fees, or none readable        -> null
 *  - 1 fee                           -> "USD $60.00"
 *  - 2+ same denomination, same value -> "USD $60.00"
 *  - 2+ same denomination, range     -> "USD $60.00 – $85.00"
 *  - 2+ mixed denominations          -> "From USD $40.00" (over the largest group only)
 *
 * THREE THINGS THIS DELIBERATELY REFUSES TO DO, each of which it used to do:
 *
 * 1. **Assume whole units.** `Intl.NumberFormat(style:'currency')` formats its argument as MAJOR
 *    units, so a record carrying MINOR units rendered 100× high — `{amount: 6000, currencyCode:
 *    'USD'}` became "$6,000.00" where the entry costs $60.00. Federation surfaces genuinely differ
 *    on this: at least one states entry fees in minor units and another states the same concept in
 *    major. A fee with no `unit` is now rendered as unknown rather than guessed at.
 *
 * 2. **Compare across currencies.** The minimum used to be picked by sorting on `amount` alone
 *    across a set already known to hold more than one currency, then labelled with the winner's own
 *    currency — so 40 EUR "beat" 45 USD on arithmetic that means nothing. The range is now computed
 *    within a single denomination.
 *
 * 3. **Invent a currency.** An absent `currencyCode` defaulted to USD. An absent currency is
 *    unknown, not American.
 */

import { TournamentEntryFee } from './types';

const EN_DASH = '–';

interface Denominated {
  amount: number;
  currencyCode: string;
  unit: 'MINOR' | 'MAJOR';
}

/** Minor-unit exponents that are not 2. Everything else in practice is 2. */
const MINOR_EXPONENT: Record<string, number> = { JPY: 0, KRW: 0, VND: 0, CLP: 0, ISK: 0, KWD: 3, BHD: 3, OMR: 3, JOD: 3, TND: 3 };

/** Convert to whole currency units for display. The exponent is currency-specific, not always 2. */
function toMajor({ amount, currencyCode, unit }: Denominated): number {
  if (unit === 'MAJOR') return amount;
  const exponent = MINOR_EXPONENT[currencyCode] ?? 2;
  return amount / 10 ** exponent;
}

function formatAmount(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currencyCode}`;
  }
}

/** Only fees that state amount, currency AND unit can be placed on a scale. */
function denominated(fees: TournamentEntryFee[]): Denominated[] {
  const out: Denominated[] = [];
  for (const fee of fees) {
    if (typeof fee?.amount !== 'number' || Number.isNaN(fee.amount)) continue;
    if (!fee.currencyCode || !fee.unit) continue;
    out.push({ amount: fee.amount, currencyCode: fee.currencyCode, unit: fee.unit });
  }
  return out;
}

export function formatFeeRange(fees?: TournamentEntryFee[] | null): string | null {
  if (!fees?.length) return null;

  const valid = denominated(fees);
  if (!valid.length) return null;

  // Group by denomination so a range is never taken across currencies or scales.
  const groups = new Map<string, Denominated[]>();
  for (const fee of valid) {
    const key = `${fee.currencyCode}/${fee.unit}`;
    const group = groups.get(key);
    if (group) group.push(fee);
    else groups.set(key, [fee]);
  }

  const ranked = [...groups.values()].sort((a, b) => b.length - a.length);
  const chosen = ranked[0];
  const code = chosen[0].currencyCode;

  const amounts = chosen.map(toMajor).sort((a, b) => a - b);
  const min = amounts[0];
  const max = amounts.at(-1) ?? min;

  // More than one denomination present: a range would be meaningless, so state a floor within the
  // denomination we can actually read rather than implying a comparison we cannot make.
  if (ranked.length > 1) return `From ${code} ${formatAmount(min, code)}`;

  if (min === max) return `${code} ${formatAmount(min, code)}`;
  return `${code} ${formatAmount(min, code)} ${EN_DASH} ${formatAmount(max, code)}`;
}
