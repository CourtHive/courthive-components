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
export declare function parseCalendarDate(input?: string | null): CalendarDate | null;
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
export declare function startOfDayInZone(date: CalendarDate, timeZone?: string): Date;
/**
 * Returns the exclusive end-of-day boundary for the given calendar day —
 * i.e. the start of the next calendar day in the target zone. Useful for
 * "now is past the end of this day" comparisons where the day is inclusive.
 */
export declare function startOfNextDayInZone(date: CalendarDate, timeZone?: string): Date;
export {};
