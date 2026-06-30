/**
 * Pure ISO-date range formatter shared by card primitives.
 *
 *   "May 22, 2026"                  (single date)
 *   "May 22 – May 24, 2026"         (same-year range)
 *   "Dec 30, 2025 – Jan 2, 2026"    (cross-year range)
 *
 * Returns undefined when neither bound is present or both parse as NaN.
 *
 * startDate/endDate are CALENDAR DAYS (YYYY-MM-DD), so they must be parsed as
 * such — `new Date("2026-06-30")` parses as UTC midnight and renders one day
 * early west of UTC (in America/New_York it formats as "Jun 29"), which made a
 * June-30 tournament's card read "… – Jun 29" while its Live pill (which uses
 * parseCalendarDate) stayed correct. Build a LOCAL-midnight Date from the
 * calendar parts so the day survives toLocaleDateString in any host timezone.
 */

import { parseCalendarDate } from '../zonedDates';

function toLocalCalendarDate(iso?: string): Date | null {
  if (!iso) return null;
  const cal = parseCalendarDate(iso);
  if (cal) return new Date(cal.year, cal.month - 1, cal.day);
  const fallback = new Date(iso);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatMonthDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFull(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateRange(startISO?: string, endISO?: string): string | undefined {
  if (!startISO && !endISO) return undefined;
  const start = toLocalCalendarDate(startISO);
  const end = toLocalCalendarDate(endISO);

  const hasStart = !!start && !Number.isNaN(start.getTime());
  const hasEnd = !!end && !Number.isNaN(end.getTime());
  if (!hasStart && !hasEnd) return undefined;

  if (hasStart && hasEnd && start.getTime() === end.getTime()) {
    return formatFull(start);
  }
  if (hasStart && hasEnd) {
    if (start.getFullYear() === end.getFullYear()) {
      return `${formatMonthDay(start)} – ${formatMonthDay(end)}, ${end.getFullYear()}`;
    }
    return `${formatFull(start)} – ${formatFull(end)}`;
  }
  const only = hasStart ? start : (end as Date);
  return formatFull(only);
}
