import { describe, expect, it } from 'vitest';

import { formatDateRange } from '../formatDateRange';

/**
 * startDate/endDate are calendar days (YYYY-MM-DD). These assertions must hold
 * in ANY host timezone. Before the calendar-day fix, `new Date("2026-06-30")`
 * parsed as UTC midnight and rendered as "Jun 29" west of UTC — the bug that
 * made a June-30 tournament's card read "… – Jun 29" while its Live pill (which
 * uses parseCalendarDate) stayed correct. Run this suite under a negative-offset
 * zone (e.g. TZ=America/New_York) to exercise the regression directly.
 */
const JUN_30 = 'Jun 30';
const JUN_30_2026 = 'Jun 30, 2026';
const ISO_JUN_30 = '2026-06-30';

describe('formatDateRange', () => {
  it('renders a same-year range on its true calendar days', () => {
    expect(formatDateRange('2026-06-27', ISO_JUN_30)).toBe('Jun 27 – Jun 30, 2026');
  });

  it('does not shift the end day backward (regression: BOBOCA Jun 30 → "Jun 29")', () => {
    const out = formatDateRange('2026-06-27', ISO_JUN_30) ?? '';
    expect(out).toContain(JUN_30);
    expect(out).not.toContain('Jun 29');
  });

  it('renders a single date when only one bound is present', () => {
    expect(formatDateRange(undefined, ISO_JUN_30)).toBe(JUN_30_2026);
    expect(formatDateRange(ISO_JUN_30)).toBe(JUN_30_2026);
  });

  it('renders a single date when both bounds are the same calendar day', () => {
    expect(formatDateRange(ISO_JUN_30, ISO_JUN_30)).toBe(JUN_30_2026);
  });

  it('renders a cross-year range with full dates on both sides', () => {
    expect(formatDateRange('2025-12-30', '2026-01-02')).toBe('Dec 30, 2025 – Jan 2, 2026');
  });

  it('extracts the calendar day from a full ISO timestamp', () => {
    expect(formatDateRange('2026-06-30T15:33:01.691Z')).toBe(JUN_30_2026);
  });

  it('returns undefined when neither bound is present', () => {
    expect(formatDateRange()).toBeUndefined();
  });
});
