/**
 * IANA-timezone-aware day boundary helpers.
 *
 * A TODS date string like `"2026-06-12"` means "the calendar day June 12 in
 * the tournament's local time zone". When the calling code needs to compare
 * `now` (a UTC instant) against that day's start or end, the comparison must
 * happen in the tournament's zone — otherwise a tournament in `America/
 * New_York` whose endDate is "2026-06-12" appears to end at 8pm local on the
 * 11th (midnight UTC of the 12th), four hours before the day even starts in
 * the venue.
 *
 * These helpers compute UTC `Date` instants corresponding to start-of-day
 * for a given calendar date in a given IANA timezone. When `timeZone` is
 * omitted they fall back to the host machine's local timezone — which is the
 * right default for TMX (a TD's laptop is the source of truth for their own
 * local clock).
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface CalendarDate {
  year: number;
  /** 1-indexed month (1 = January). */
  month: number;
  day: number;
}

/**
 * Parses a `YYYY-MM-DD` (or full ISO) string into its calendar parts. Returns
 * null when the input is missing or unparseable.
 */
export function parseCalendarDate(input?: string | null): CalendarDate | null {
  if (!input) return null;
  const match = DATE_RE.exec(input);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

/**
 * Returns a Date representing `00:00:00` on the given calendar day in the
 * named IANA timezone. When `timeZone` is omitted, uses the host's local
 * timezone (matching `new Date(year, month-1, day)` semantics).
 *
 * Uses a two-pass refinement on `Intl.DateTimeFormat.formatToParts` so DST
 * boundaries resolve correctly: the first pass measures the offset at an
 * estimated UTC instant; the second pass re-measures at the corrected
 * instant in case the first guess fell on the wrong side of a transition.
 */
export function startOfDayInZone(date: CalendarDate, timeZone?: string): Date {
  if (!timeZone) {
    return new Date(date.year, date.month - 1, date.day);
  }

  // Pretend the desired wall time is already UTC; measure how the target
  // timezone renders that instant, derive the offset, correct, repeat once.
  const targetUtc = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  let guess = new Date(targetUtc);
  for (let pass = 0; pass < 2; pass++) {
    const parts = formatter.formatToParts(guess);
    const part = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);
    const wallUtc = Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
      part('second'),
    );
    const offset = wallUtc - guess.getTime();
    guess = new Date(targetUtc - offset);
  }
  return guess;
}

/**
 * Returns the exclusive end-of-day boundary for the given calendar day —
 * i.e. the start of the next calendar day in the target zone. Useful for
 * "now is past the end of this day" comparisons where the day is inclusive.
 */
export function startOfNextDayInZone(date: CalendarDate, timeZone?: string): Date {
  if (!timeZone) {
    return new Date(date.year, date.month - 1, date.day + 1);
  }
  // Bump by 24h relative to start-of-day to handle DST: in zones with DST,
  // adding 24h to a wall-clock midnight can land at 23:00 or 01:00 the
  // next day; the formatToParts refinement re-anchors to true 00:00 of
  // the next calendar day in the zone.
  const sameDay = startOfDayInZone(date, timeZone);
  const naiveNextDay = new Date(sameDay.getTime() + ONE_DAY_MS);
  // Reproject naiveNextDay into the zone to find what calendar day it
  // actually represents, then take start-of-day of that calendar date.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(naiveNextDay);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return startOfDayInZone({ year: part('year'), month: part('month'), day: part('day') }, timeZone);
}
