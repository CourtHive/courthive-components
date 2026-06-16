import { parseCalendarDate, startOfDayInZone, startOfNextDayInZone } from '../zonedDates';
import { describe, it, expect } from 'vitest';

const NY = 'America/New_York';
const MAY_17 = { year: 2026, month: 5, day: 17 } as const;

describe('parseCalendarDate', () => {
  it('parses YYYY-MM-DD', () => {
    expect(parseCalendarDate('2026-05-17')).toEqual({ year: 2026, month: 5, day: 17 });
  });

  it('parses the date prefix of a full ISO timestamp', () => {
    expect(parseCalendarDate('2026-05-17T12:34:56Z')).toEqual({ year: 2026, month: 5, day: 17 });
  });

  it('returns null for missing or unparseable input', () => {
    expect(parseCalendarDate(undefined)).toBeNull();
    expect(parseCalendarDate('')).toBeNull();
    expect(parseCalendarDate('not a date')).toBeNull();
  });
});

describe('startOfDayInZone', () => {
  it('resolves UTC midnight when zone is UTC', () => {
    const d = startOfDayInZone(MAY_17, 'UTC');
    expect(d.toISOString()).toBe('2026-05-17T00:00:00.000Z');
  });

  // NY = UTC-4 in May (EDT). Local midnight May 17 NY == 04:00 UTC.
  it('resolves to the correct UTC instant for an EDT date', () => {
    const d = startOfDayInZone(MAY_17, NY);
    expect(d.toISOString()).toBe('2026-05-17T04:00:00.000Z');
  });

  // NY = UTC-5 in January (EST). Local midnight Jan 15 NY == 05:00 UTC.
  it('resolves to the correct UTC instant for an EST date (DST off)', () => {
    const d = startOfDayInZone({ year: 2026, month: 1, day: 15 }, NY);
    expect(d.toISOString()).toBe('2026-01-15T05:00:00.000Z');
  });

  // Tokyo = UTC+9 year-round. Local midnight May 17 JST == 15:00 UTC the
  // previous day.
  it('resolves to the correct UTC instant for a positive-offset zone', () => {
    const d = startOfDayInZone(MAY_17, 'Asia/Tokyo');
    expect(d.toISOString()).toBe('2026-05-16T15:00:00.000Z');
  });

  // India = UTC+5:30 — fractional offset, verifies the formatter math.
  it('resolves to the correct UTC instant for a fractional-offset zone', () => {
    const d = startOfDayInZone(MAY_17, 'Asia/Kolkata');
    expect(d.toISOString()).toBe('2026-05-16T18:30:00.000Z');
  });
});

describe('startOfNextDayInZone', () => {
  it('returns the UTC instant for the next calendar day in UTC', () => {
    const d = startOfNextDayInZone(MAY_17, 'UTC');
    expect(d.toISOString()).toBe('2026-05-18T00:00:00.000Z');
  });

  // NY DST starts 2026-03-08 02:00 -> 03:00. The day after March 7 in NY
  // is still 24h of wall-clock — March 8 starts at the usual midnight NY.
  // March 7 00:00 NY == 05:00 UTC (EST); March 8 00:00 NY == 05:00 UTC (EST,
  // before the 2am→3am shift). After the shift (March 9 00:00 NY) we're
  // back to EDT == 04:00 UTC.
  it('handles DST-spring-forward correctly', () => {
    const startOfMar8 = startOfNextDayInZone({ year: 2026, month: 3, day: 7 }, NY);
    expect(startOfMar8.toISOString()).toBe('2026-03-08T05:00:00.000Z');

    const startOfMar9 = startOfNextDayInZone({ year: 2026, month: 3, day: 8 }, NY);
    expect(startOfMar9.toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });
});
