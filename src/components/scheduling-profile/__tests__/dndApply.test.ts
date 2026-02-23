import { describe, it, expect } from 'vitest';
import { applyDropCommit } from '../domain/dndApply';
import type { SchedulingProfile, CatalogDragPayload, PlannedDragPayload } from '../types';

const DAY1 = '2026-06-15';

const catalogRound = {
  tournamentId: 'T1',
  eventId: 'E1',
  eventName: 'Boys U16',
  drawId: 'D1',
  drawName: 'Main',
  structureId: 'S1',
  roundNumber: 5,
  roundName: 'R32',
};

function makeProfile(): SchedulingProfile {
  return [
    {
      scheduleDate: DAY1,
      venues: [
        {
          venueId: 'V1',
          rounds: [
            { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32', sortOrder: 1 },
            { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 6, roundName: 'R16', sortOrder: 2 },
          ],
        },
        { venueId: 'V2', rounds: [] },
      ],
    },
  ];
}

describe('applyDropCommit', () => {
  describe('CATALOG_ROUND drops', () => {
    it('adds a round from catalog to an empty venue', () => {
      const profile: SchedulingProfile = [
        { scheduleDate: DAY1, venues: [{ venueId: 'V1', rounds: [] }] },
      ];
      const drag: CatalogDragPayload = { type: 'CATALOG_ROUND', roundRef: catalogRound };
      const result = applyDropCommit(profile, drag, { date: DAY1, venueId: 'V1', index: 0 });

      expect(result.ok).toBe(true);
      expect(result.profile[0].venues[0].rounds).toHaveLength(1);
      expect(result.profile[0].venues[0].rounds[0].roundName).toBe('R32');
      expect(result.profile[0].venues[0].rounds[0].sortOrder).toBe(1);
    });

    it('inserts at the correct index', () => {
      const profile = makeProfile();
      const drag: CatalogDragPayload = {
        type: 'CATALOG_ROUND',
        roundRef: { ...catalogRound, roundNumber: 7, roundName: 'QF' },
      };
      const result = applyDropCommit(profile, drag, { date: DAY1, venueId: 'V1', index: 1 });

      expect(result.ok).toBe(true);
      const rounds = result.profile[0].venues[0].rounds;
      expect(rounds).toHaveLength(3);
      expect(rounds[1].roundName).toBe('QF');
      // sortOrder should be renormalized
      expect(rounds.map((r) => r.sortOrder)).toEqual([1, 2, 3]);
    });

    it('creates day and venue on demand', () => {
      const profile: SchedulingProfile = [];
      const drag: CatalogDragPayload = { type: 'CATALOG_ROUND', roundRef: catalogRound };
      const result = applyDropCommit(profile, drag, { date: '2026-06-20', venueId: 'NEW_V', index: 0 });

      expect(result.ok).toBe(true);
      expect(result.profile).toHaveLength(1);
      expect(result.profile[0].scheduleDate).toBe('2026-06-20');
      expect(result.profile[0].venues[0].venueId).toBe('NEW_V');
      expect(result.profile[0].venues[0].rounds).toHaveLength(1);
    });

    it('does not mutate the original profile', () => {
      const profile = makeProfile();
      const originalLen = profile[0].venues[0].rounds.length;
      const drag: CatalogDragPayload = { type: 'CATALOG_ROUND', roundRef: catalogRound };
      applyDropCommit(profile, drag, { date: DAY1, venueId: 'V1', index: 0 });

      expect(profile[0].venues[0].rounds).toHaveLength(originalLen);
    });
  });

  describe('PLANNED_ROUND moves', () => {
    it('moves a round between venues', () => {
      const profile = makeProfile();
      const drag: PlannedDragPayload = {
        type: 'PLANNED_ROUND',
        locator: {
          date: DAY1,
          venueId: 'V1',
          index: 0,
          roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 },
        },
      };
      const result = applyDropCommit(profile, drag, { date: DAY1, venueId: 'V2', index: 0 });

      expect(result.ok).toBe(true);
      expect(result.profile[0].venues[0].rounds).toHaveLength(1); // V1 now has 1
      expect(result.profile[0].venues[1].rounds).toHaveLength(1); // V2 now has 1
      expect(result.profile[0].venues[1].rounds[0].roundName).toBe('R32');
    });

    it('reorders within the same venue', () => {
      // Use a 3-element list to properly test reorder
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [
                { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32', sortOrder: 1 },
                { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 6, roundName: 'R16', sortOrder: 2 },
                { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 7, roundName: 'QF', sortOrder: 3 },
              ],
            },
          ],
        },
      ];
      const drag: PlannedDragPayload = {
        type: 'PLANNED_ROUND',
        locator: {
          date: DAY1,
          venueId: 'V1',
          index: 0,
          roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 },
        },
      };
      // Move index 0 (R32) to index 3 (end). After removal [R16,QF], clamp(3,0,2)=2, adjust: 2-1=1 → insert at 1
      const result = applyDropCommit(profile, drag, { date: DAY1, venueId: 'V1', index: 3 });

      expect(result.ok).toBe(true);
      const rounds = result.profile[0].venues[0].rounds;
      expect(rounds).toHaveLength(3);
      // R16, R32, QF — R32 moved from front to middle
      expect(rounds[0].roundName).toBe('R16');
      expect(rounds[1].roundName).toBe('R32');
      expect(rounds[2].roundName).toBe('QF');
    });

    it('adjusts target index when removing from earlier position in same list', () => {
      const profile = makeProfile();
      const drag: PlannedDragPayload = {
        type: 'PLANNED_ROUND',
        locator: {
          date: DAY1,
          venueId: 'V1',
          index: 0,
          roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 },
        },
      };
      const result = applyDropCommit(profile, drag, { date: DAY1, venueId: 'V1', index: 2 });

      expect(result.ok).toBe(true);
      // After removing index 0, the original target 2 is clamped to 1 (end of list)
      const rounds = result.profile[0].venues[0].rounds;
      expect(rounds).toHaveLength(2);
    });
  });

  describe('invalid drag type', () => {
    it('returns ok: false for unknown drag type', () => {
      const profile = makeProfile();
      const drag = { type: 'UNKNOWN' } as any;
      const result = applyDropCommit(profile, drag, { date: DAY1, venueId: 'V1', index: 0 });
      expect(result.ok).toBe(false);
    });
  });
});
