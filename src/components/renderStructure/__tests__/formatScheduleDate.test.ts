import { formatScheduleDate } from '../renderSchedule';
import { describe, expect, it } from 'vitest';

const OCTOBER_26 = '2026-10-26';

describe('formatScheduleDate', () => {
  it("abbreviates the month with a period and drops the hour's leading zero and space", () => {
    expect(formatScheduleDate(OCTOBER_26, '08:00')).toBe('Mon 26 Oct., 8:00AM');
    expect(formatScheduleDate(OCTOBER_26, '07:30')).toBe('Mon 26 Oct., 7:30AM');
    expect(formatScheduleDate(OCTOBER_26, '13:05')).toBe('Mon 26 Oct., 1:05PM');
    expect(formatScheduleDate(OCTOBER_26, '00:15')).toBe('Mon 26 Oct., 12:15AM');
  });

  it('adds no period to a month that is not shortened', () => {
    expect(formatScheduleDate('2026-05-04', '10:00')).toBe('Mon 4 May, 10:00AM');
    expect(formatScheduleDate('2026-06-01')).toBe('Mon 1 Jun.');
  });

  it('a date without a time shows the date alone', () => {
    expect(formatScheduleDate(OCTOBER_26)).toBe('Mon 26 Oct.');
  });
});
