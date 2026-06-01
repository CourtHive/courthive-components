/**
 * Tournament Card — Status Pill Resolver
 *
 * Resolves a tournament's status pill from its dates + tournamentStatus +
 * registrationProfile registration gates. Pure function.
 *
 * Rules (precedence order):
 *   1. tournamentStatus === 'CANCELLED'                                  -> "Cancelled"
 *   2. tournamentStatus === 'COMPLETED' OR now > endDate                 -> "Completed"
 *   3. startDate <= now <= endDate                                       -> "Live"
 *   4. entriesClose - now <= 7d AND not yet closed                       -> "Closing Soon"
 *   5. entriesOpen > now (future registration)                           -> "Registration {Mon D}"
 *   6. else                                                              -> null
 */

import { TournamentStatusPill } from './types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface StatusResolverInput {
  tournamentStatus?: string;
  startDate?: string;
  endDate?: string;
  entriesOpen?: string;
  entriesClose?: string;
}

function parseDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isLiveWindow(now: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  return start.getTime() <= now.getTime() && now.getTime() <= end.getTime();
}

function formatRegistrationOpenLabel(open: Date): string {
  const formatted = open.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Opens ${formatted}`;
}

export function resolveTournamentStatus(
  input: StatusResolverInput,
  now: Date = new Date()
): TournamentStatusPill | null {
  const status = input.tournamentStatus?.toUpperCase();

  if (status === 'CANCELLED' || status === 'ABANDONDED' || status === 'ABANDONED') {
    return { kind: 'cancelled', label: 'Cancelled' };
  }

  const endDate = parseDate(input.endDate);
  if (status === 'COMPLETED' || (endDate && now.getTime() > endDate.getTime())) {
    return { kind: 'completed', label: 'Completed' };
  }

  const startDate = parseDate(input.startDate);
  if (isLiveWindow(now, startDate, endDate)) {
    return { kind: 'live', label: 'Live' };
  }

  const entriesClose = parseDate(input.entriesClose);
  if (entriesClose) {
    const delta = entriesClose.getTime() - now.getTime();
    if (delta > 0 && delta <= SEVEN_DAYS_MS) {
      return { kind: 'closing-soon', label: 'Closing Soon' };
    }
  }

  const entriesOpen = parseDate(input.entriesOpen);
  if (entriesOpen && entriesOpen.getTime() > now.getTime()) {
    return { kind: 'registration-opens', label: formatRegistrationOpenLabel(entriesOpen) };
  }

  return null;
}
