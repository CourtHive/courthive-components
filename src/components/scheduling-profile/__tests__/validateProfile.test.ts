import { describe, it, expect } from 'vitest';
import { validateProfile } from '../domain/validateProfile';
import type { SchedulingProfile, TemporalAdapter } from '../types';

function makeRound(overrides: Record<string, unknown> = {}) {
  return {
    tournamentId: 'T1',
    eventId: 'E1',
    eventName: 'Boys U16',
    drawId: 'D1',
    structureId: 'S1',
    roundNumber: 5,
    roundName: 'R32',
    ...overrides,
  };
}

function makeTemporal(schedulable: string[]): TemporalAdapter {
  return {
    isDateAvailable: (date: string) =>
      schedulable.includes(date) ? { ok: true } : { ok: false, reason: 'Not schedulable' },
  };
}

describe('validateProfile', () => {
  it('returns empty for valid empty profile', () => {
    const results = validateProfile({ profile: [] });
    expect(results).toEqual([]);
  });

  describe('DATE_UNAVAILABLE', () => {
    it('reports unavailable dates', () => {
      const profile: SchedulingProfile = [
        { scheduleDate: '2026-06-15', venues: [{ venueId: 'V1', rounds: [makeRound()] }] },
      ];
      const results = validateProfile({
        profile,
        temporal: makeTemporal(['2026-06-16']),
      });
      expect(results).toHaveLength(1);
      expect(results[0].code).toBe('DATE_UNAVAILABLE');
      expect(results[0].severity).toBe('ERROR');
      expect(results[0].fixActions).toHaveLength(1);
      expect(results[0].fixActions![0].kind).toBe('OPEN_TEMPORAL_GRID');
    });

    it('does not report available dates', () => {
      const profile: SchedulingProfile = [
        { scheduleDate: '2026-06-15', venues: [{ venueId: 'V1', rounds: [makeRound()] }] },
      ];
      const results = validateProfile({
        profile,
        temporal: makeTemporal(['2026-06-15']),
      });
      const dateIssues = results.filter((r) => r.code === 'DATE_UNAVAILABLE');
      expect(dateIssues).toHaveLength(0);
    });
  });

  describe('INVALID_SEGMENT_CONFIG', () => {
    it('flags invalid segment configuration', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundSegment: { segmentNumber: 3, segmentsCount: 2 } })],
            },
          ],
        },
      ];
      const results = validateProfile({ profile });
      const segIssues = results.filter((r) => r.code === 'INVALID_SEGMENT_CONFIG');
      expect(segIssues).toHaveLength(1);
    });

    it('accepts valid segment config', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundSegment: { segmentNumber: 1, segmentsCount: 2 } })],
            },
          ],
        },
      ];
      const results = validateProfile({ profile });
      const segIssues = results.filter((r) => r.code === 'INVALID_SEGMENT_CONFIG');
      expect(segIssues).toHaveLength(0);
    });
  });

  describe('DUPLICATE_ROUND', () => {
    it('flags duplicate non-segmented rounds', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            { venueId: 'V1', rounds: [makeRound()] },
            { venueId: 'V2', rounds: [makeRound()] },
          ],
        },
      ];
      const results = validateProfile({ profile });
      const dupes = results.filter((r) => r.code === 'DUPLICATE_ROUND');
      expect(dupes).toHaveLength(1);
      expect(dupes[0].fixActions![0].kind).toBe('JUMP_TO_ITEM');
    });

    it('does not flag different rounds', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundNumber: 5 }), makeRound({ roundNumber: 6, roundName: 'R16' })],
            },
          ],
        },
      ];
      const results = validateProfile({ profile });
      const dupes = results.filter((r) => r.code === 'DUPLICATE_ROUND');
      expect(dupes).toHaveLength(0);
    });
  });

  describe('DUPLICATE_SEGMENT', () => {
    it('flags duplicate segments', () => {
      const seg = { segmentNumber: 1, segmentsCount: 2 };
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundSegment: seg }), makeRound({ roundSegment: seg })],
            },
          ],
        },
      ];
      const results = validateProfile({ profile });
      const dupes = results.filter((r) => r.code === 'DUPLICATE_SEGMENT');
      expect(dupes).toHaveLength(1);
    });
  });

  describe('ROUND_ORDER_VIOLATION', () => {
    it('flags later round scheduled before earlier round', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [
                makeRound({ roundNumber: 6, roundName: 'R16' }),
                makeRound({ roundNumber: 5, roundName: 'R32' }),
              ],
            },
          ],
        },
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(violations[0].fixActions!.length).toBeGreaterThanOrEqual(1);
    });

    it('accepts correctly ordered rounds', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [
                makeRound({ roundNumber: 5, roundName: 'R32' }),
                makeRound({ roundNumber: 6, roundName: 'R16' }),
              ],
            },
          ],
        },
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations).toHaveLength(0);
    });

    it('does not flag rounds from different draws', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [
                makeRound({ drawId: 'D1', roundNumber: 6, roundName: 'R16' }),
                makeRound({ drawId: 'D2', roundNumber: 5, roundName: 'R32' }),
              ],
            },
          ],
        },
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations).toHaveLength(0);
    });

    it('handles precedence across dates', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-16',
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 6, roundName: 'R16' })] }],
        },
        {
          scheduleDate: '2026-06-15',
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 5, roundName: 'R32' })] }],
        },
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      // R32 on day 1, R16 on day 2 = correct order
      expect(violations).toHaveLength(0);
    });
  });
});
