import { resolveTournamentStatus } from '../statusResolver';
import { describe, it, expect } from 'vitest';

const NOW = new Date('2026-05-17T12:00:00Z');
const START = '2026-05-15';
const END = '2026-05-17';
// Boundary tests pin timeZone so they're deterministic regardless of the
// host machine the suite runs on. The zone-less fallback path (host local)
// has its own dedicated tests further down.
const UTC = 'UTC';
const NY = 'America/New_York';
const MAY_20 = '2026-05-20';

describe('resolveTournamentStatus', () => {
  it('returns null when no signals match', () => {
    expect(resolveTournamentStatus({}, NOW)).toBeNull();
  });

  it('returns "Cancelled" for tournamentStatus === CANCELLED', () => {
    const out = resolveTournamentStatus({ tournamentStatus: 'CANCELLED' }, NOW);
    expect(out).toEqual({ kind: 'cancelled', label: 'Cancelled' });
  });

  it('returns "Cancelled" for misspelled ABANDONDED', () => {
    const out = resolveTournamentStatus({ tournamentStatus: 'ABANDONDED' }, NOW);
    expect(out?.kind).toBe('cancelled');
  });

  it('returns "Completed" when tournamentStatus is COMPLETED', () => {
    const out = resolveTournamentStatus({ tournamentStatus: 'COMPLETED' }, NOW);
    expect(out).toEqual({ kind: 'completed', label: 'Completed' });
  });

  it('returns "Completed" when endDate is in the past', () => {
    const out = resolveTournamentStatus(
      { startDate: '2026-05-10', endDate: '2026-05-12' },
      NOW
    );
    expect(out?.kind).toBe('completed');
  });

  it('returns "Live" when now is between startDate and endDate', () => {
    const out = resolveTournamentStatus(
      { startDate: START, endDate: MAY_20 },
      NOW
    );
    expect(out).toEqual({ kind: 'live', label: 'Live' });
  });

  // Regression: endDate is the inclusive last day, NOT the moment the
  // tournament ends. A tournament whose endDate is today should still
  // render as Live; flipping to Completed at the start of the endDate
  // day (the previous behaviour) is wrong.
  it('returns "Live" on the endDate day itself (inclusive boundary)', () => {
    const out = resolveTournamentStatus({ startDate: START, endDate: END, timeZone: UTC }, NOW);
    expect(out?.kind).toBe('live');
  });

  it('returns "Live" at the very start of the endDate day', () => {
    const out = resolveTournamentStatus(
      { startDate: START, endDate: END, timeZone: UTC },
      new Date(`${END}T00:00:01Z`)
    );
    expect(out?.kind).toBe('live');
  });

  it('flips to "Completed" only once the endDate day has fully elapsed', () => {
    // 23:59:59 on the endDate day — still Live
    const stillLive = resolveTournamentStatus(
      { startDate: START, endDate: END, timeZone: UTC },
      new Date(`${END}T23:59:59Z`)
    );
    expect(stillLive?.kind).toBe('live');

    // 00:00:00 on the day after endDate — now Completed
    const justCompleted = resolveTournamentStatus(
      { startDate: START, endDate: END, timeZone: UTC },
      new Date('2026-05-18T00:00:00Z')
    );
    expect(justCompleted?.kind).toBe('completed');
  });

  // Zone-aware: NY is UTC-4 in May. A tournament with endDate "2026-05-17"
  // in New York runs through 23:59:59 NY on the 17th == 03:59:59 UTC on
  // the 18th. The chip must NOT flip to Completed at 00:00 UTC on the 18th
  // (that's still 8pm NY on the 17th, mid-play).
  it('respects the tournament time zone when computing the endDate boundary', () => {
    const input = { startDate: START, endDate: END, timeZone: NY };

    // 23:00 UTC on the 17th == 19:00 NY on the 17th — still Live
    expect(
      resolveTournamentStatus(input, new Date('2026-05-17T23:00:00Z'))?.kind
    ).toBe('live');

    // 02:00 UTC on the 18th == 22:00 NY on the 17th — still Live
    expect(
      resolveTournamentStatus(input, new Date('2026-05-18T02:00:00Z'))?.kind
    ).toBe('live');

    // 03:59:59 UTC on the 18th == 23:59:59 NY on the 17th — still Live
    expect(
      resolveTournamentStatus(input, new Date('2026-05-18T03:59:59Z'))?.kind
    ).toBe('live');

    // 04:00:00 UTC on the 18th == 00:00 NY on the 18th — now Completed
    expect(
      resolveTournamentStatus(input, new Date('2026-05-18T04:00:00Z'))?.kind
    ).toBe('completed');
  });

  // Zone-aware: a tournament that starts "2026-05-15" in NY must not show
  // Live at midnight UTC on the 15th — that's 8pm NY on the 14th, before
  // the tournament's own clock has ticked over to the 15th.
  it('respects the tournament time zone when computing the startDate boundary', () => {
    const input = { startDate: START, endDate: MAY_20, timeZone: NY };

    // 03:59:59 UTC on the 15th == 23:59:59 NY on the 14th — not yet Live
    expect(
      resolveTournamentStatus(input, new Date('2026-05-15T03:59:59Z'))?.kind
    ).not.toBe('live');

    // 04:00:00 UTC on the 15th == 00:00 NY on the 15th — Live
    expect(
      resolveTournamentStatus(input, new Date('2026-05-15T04:00:00Z'))?.kind
    ).toBe('live');
  });

  // Host-local fallback: when no timeZone is supplied the resolver uses the
  // host machine's local clock. We verify the boundary against the same
  // local-time construction the resolver itself uses, so the assertion is
  // host-TZ-independent.
  it('falls back to the host local timezone when timeZone is omitted', () => {
    // Local midnight at the start of the day AFTER endDate (May 18 local).
    const localEndExclusive = new Date(2026, 4, 18, 0, 0, 0);
    // One millisecond before that boundary — still Live.
    const justBefore = new Date(localEndExclusive.getTime() - 1);
    expect(
      resolveTournamentStatus({ startDate: START, endDate: END }, justBefore)?.kind
    ).toBe('live');

    // At the boundary — Completed.
    expect(
      resolveTournamentStatus({ startDate: START, endDate: END }, localEndExclusive)?.kind
    ).toBe('completed');
  });

  it('returns "Closing Soon" when entriesClose is within 7 days', () => {
    const out = resolveTournamentStatus(
      {
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        entriesClose: '2026-05-22T00:00:00Z'
      },
      NOW
    );
    expect(out?.kind).toBe('closing-soon');
  });

  it('does NOT return "Closing Soon" when entriesClose is in the past', () => {
    const out = resolveTournamentStatus(
      {
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        entriesClose: '2026-05-10T00:00:00Z'
      },
      NOW
    );
    expect(out?.kind).not.toBe('closing-soon');
  });

  it('returns "registration-opens" with formatted label when entriesOpen is in the future', () => {
    const out = resolveTournamentStatus(
      {
        startDate: '2026-07-01',
        endDate: '2026-07-03',
        entriesOpen: '2026-06-15T00:00:00Z'
      },
      NOW
    );
    expect(out?.kind).toBe('registration-opens');
    expect(out?.label).toContain('Opens');
  });

  it('CANCELLED takes precedence over Live window', () => {
    const out = resolveTournamentStatus(
      {
        tournamentStatus: 'CANCELLED',
        startDate: START,
        endDate: MAY_20
      },
      NOW
    );
    expect(out?.kind).toBe('cancelled');
  });
});
