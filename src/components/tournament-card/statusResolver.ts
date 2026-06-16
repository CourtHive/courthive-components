/**
 * Tournament Card — Status Pill Resolver
 *
 * Resolves a tournament's status pill from its dates + tournamentStatus +
 * registrationProfile registration gates. Pure function.
 *
 * Date semantics: `startDate` and `endDate` are calendar days (YYYY-MM-DD)
 * in the tournament's local time zone. The window is INCLUSIVE on both
 * sides — a tournament whose endDate is "2026-06-12" is Live throughout
 * 2026-06-12 local and only flips to Completed at start-of-day on
 * 2026-06-13 local. When `timeZone` is provided we project these calendar
 * boundaries into the named IANA zone; when it's omitted (or unknown) we
 * fall back to the host machine's local timezone — which is the right
 * default for TMX (the TD's own clock is the truth about their event).
 *
 * `entriesOpen` and `entriesClose` are full ISO timestamps (already
 * absolute moments), so they're compared directly with no zone projection.
 *
 * Rules (precedence order):
 *   1. tournamentStatus === 'CANCELLED'                                  -> "Cancelled"
 *   2. tournamentStatus === 'COMPLETED' OR now >= start-of-day(endDate+1) -> "Completed"
 *   3. start-of-day(startDate) <= now < start-of-day(endDate+1)          -> "Live"
 *   4. entriesClose - now <= 7d AND not yet closed                       -> "Closing Soon"
 *   5. entriesOpen > now (future registration)                           -> "Registration {Mon D}"
 *   6. else                                                              -> null
 */

import { parseCalendarDate, startOfDayInZone, startOfNextDayInZone } from '../../helpers/zonedDates';
import { TournamentStatusPill } from './types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface StatusResolverInput {
  tournamentStatus?: string;
  startDate?: string;
  endDate?: string;
  entriesOpen?: string;
  entriesClose?: string;
  /** IANA zone (e.g. "America/New_York"). Falls back to host local when absent. */
  timeZone?: string;
}

function parseInstant(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isLiveWindow(now: Date, start: Date | null, endExclusive: Date | null): boolean {
  if (!start || !endExclusive) return false;
  return start.getTime() <= now.getTime() && now.getTime() < endExclusive.getTime();
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

  const timeZone = input.timeZone;
  const endCal = parseCalendarDate(input.endDate);
  // Tournament is Live throughout the endDate day in its local zone; the
  // "completed" boundary is start-of-day on the day AFTER endDate in that
  // zone. Without zone projection the comparison happens in UTC and can
  // misfire by up to 12 hours on tournaments far from UTC.
  const endExclusive = endCal ? startOfNextDayInZone(endCal, timeZone) : null;
  if (status === 'COMPLETED' || (endExclusive && now.getTime() >= endExclusive.getTime())) {
    return { kind: 'completed', label: 'Completed' };
  }

  const startCal = parseCalendarDate(input.startDate);
  const startInstant = startCal ? startOfDayInZone(startCal, timeZone) : null;
  if (isLiveWindow(now, startInstant, endExclusive)) {
    return { kind: 'live', label: 'Live' };
  }

  const entriesClose = parseInstant(input.entriesClose);
  if (entriesClose) {
    const delta = entriesClose.getTime() - now.getTime();
    if (delta > 0 && delta <= SEVEN_DAYS_MS) {
      return { kind: 'closing-soon', label: 'Closing Soon' };
    }
  }

  const entriesOpen = parseInstant(input.entriesOpen);
  if (entriesOpen && entriesOpen.getTime() > now.getTime()) {
    return { kind: 'registration-opens', label: formatRegistrationOpenLabel(entriesOpen) };
  }

  return null;
}
