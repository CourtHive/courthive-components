/**
 * Tournament Card — Fee Formatting
 *
 * Formats `registrationProfile.entryFees[]` into a single badge string:
 *  - 0 fees                          -> null
 *  - 1 fee                           -> "USD $60.00"
 *  - 2+ same currency, same amount   -> "USD $60.00"
 *  - 2+ same currency, range         -> "USD $40.00 – $85.00"
 *  - 2+ mixed currencies             -> "From USD $40.00"
 */

import { TournamentEntryFee } from './types';

const DEFAULT_CURRENCY = 'USD';
const EN_DASH = '–';

function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function uniqueCurrencyCodes(fees: TournamentEntryFee[]): string[] {
  const codes = new Set<string>();
  for (const fee of fees) {
    codes.add(fee.currencyCode || DEFAULT_CURRENCY);
  }
  return [...codes];
}

function findMinFee(fees: TournamentEntryFee[]): TournamentEntryFee | undefined {
  return [...fees].sort((a, b) => a.amount - b.amount).find(Boolean);
}

export function formatFeeRange(fees?: TournamentEntryFee[] | null): string | null {
  if (!fees || fees.length === 0) return null;

  const valid = fees.filter((f) => typeof f.amount === 'number' && !Number.isNaN(f.amount));
  if (valid.length === 0) return null;

  if (valid.length === 1) {
    const fee = valid[0];
    const code = fee.currencyCode || DEFAULT_CURRENCY;
    return `${code} ${formatAmount(fee.amount, code)}`;
  }

  const currencies = uniqueCurrencyCodes(valid);

  if (currencies.length > 1) {
    const min = findMinFee(valid);
    if (!min) return null;
    const code = min.currencyCode || DEFAULT_CURRENCY;
    return `From ${code} ${formatAmount(min.amount, code)}`;
  }

  const code = currencies[0];
  const amounts = valid.map((f) => f.amount).sort((a, b) => a - b);
  const min = amounts[0];
  const max = amounts.at(-1) ?? min;

  if (min === max) return `${code} ${formatAmount(min, code)}`;
  return `${code} ${formatAmount(min, code)} ${EN_DASH} ${formatAmount(max, code)}`;
}
