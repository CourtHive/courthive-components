import { afterEach, describe, expect, it, vi } from 'vitest';
import { consideredDateOrToday } from '../consideredDate';

// The age-category editors used to take "today" from a module-level default computed at import, so a
// page loaded on the 17th offered the 17th all week. Clock plan slice 0-d.2.
describe('consideredDateOrToday', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('works out today at the call, so a page left open past midnight moves on', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T23:59:00Z'));
    expect(consideredDateOrToday()).toBe('2026-05-17');
    vi.setSystemTime(new Date('2026-05-18T00:01:00Z'));
    expect(consideredDateOrToday()).toBe('2026-05-18');
  });

  it('prefers the date the host configured', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T00:01:00Z'));
    expect(consideredDateOrToday('2026-06-01')).toBe('2026-06-01');
  });
});
