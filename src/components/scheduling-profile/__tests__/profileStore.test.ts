import { describe, it, expect, vi } from 'vitest';
import { ProfileStore } from '../engine/profileStore';
import type { SchedulingProfileConfig, SchedulingProfile, TemporalAdapter } from '../types';

const venues = [
  { venueId: 'V1', name: 'Venue A' },
  { venueId: 'V2', name: 'Venue B' },
];

const roundCatalog = [
  { tournamentId: 'T1', eventId: 'E1', eventName: 'Boys U16', drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 5, roundName: 'R32', matchCountEstimate: 16 },
  { tournamentId: 'T1', eventId: 'E1', eventName: 'Boys U16', drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 6, roundName: 'R16', matchCountEstimate: 8 },
  { tournamentId: 'T1', eventId: 'E1', eventName: 'Boys U16', drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 7, roundName: 'QF', matchCountEstimate: 4 },
];

const schedulableDates = ['2026-06-15', '2026-06-16', '2026-06-17'];

function makeConfig(overrides: Partial<SchedulingProfileConfig> = {}): SchedulingProfileConfig {
  return { venues, roundCatalog, schedulableDates, ...overrides };
}

function makeTemporal(): TemporalAdapter {
  return {
    isDateAvailable: (date: string) =>
      schedulableDates.includes(date) ? { ok: true } : { ok: false, reason: 'Not schedulable' },
  };
}

describe('ProfileStore', () => {
  describe('initialization', () => {
    it('initializes with empty profile', () => {
      const store = new ProfileStore(makeConfig());
      const state = store.getState();
      expect(state.profileDraft).toEqual([]);
      expect(state.venues).toEqual(venues);
      expect(state.selectedDate).toBe('2026-06-15');
    });

    it('initializes with provided profile', () => {
      const initial: SchedulingProfile = [
        { scheduleDate: '2026-06-15', venues: [{ venueId: 'V1', rounds: [] }] },
      ];
      const store = new ProfileStore(makeConfig({ initialProfile: initial }));
      expect(store.getState().profileDraft).toHaveLength(1);
    });

    it('runs initial validation', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [
                { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32' },
                { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32' },
              ],
            },
          ],
        },
      ];
      const store = new ProfileStore(makeConfig({ initialProfile: profile }));
      expect(store.getState().ruleResults.length).toBeGreaterThan(0);
      expect(store.getState().issueIndex.counts.ERROR).toBeGreaterThan(0);
    });
  });

  describe('selectDate', () => {
    it('updates selected date', () => {
      const store = new ProfileStore(makeConfig());
      store.selectDate('2026-06-16');
      expect(store.getState().selectedDate).toBe('2026-06-16');
    });

    it('clears selection when changing date', () => {
      const store = new ProfileStore(makeConfig());
      store.selectCard({
        date: '2026-06-15',
        venueId: 'V1',
        index: 0,
        roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 },
      });
      store.selectDate('2026-06-16');
      expect(store.getState().selectedLocator).toBeNull();
    });
  });

  describe('dropRound', () => {
    it('adds catalog round to profile', () => {
      const store = new ProfileStore(makeConfig({ temporalAdapter: makeTemporal() }));
      const result = store.dropRound(
        { type: 'CATALOG_ROUND', roundRef: roundCatalog[0] },
        { date: '2026-06-15', venueId: 'V1', index: 0 },
      );
      expect(result.ok).toBe(true);
      expect(store.getState().profileDraft).toHaveLength(1);
      expect(store.getState().profileDraft[0].venues[0].rounds).toHaveLength(1);
    });

    it('rejects drops that cause validation errors', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [
                { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32' },
              ],
            },
          ],
        },
      ];
      const store = new ProfileStore(makeConfig({ initialProfile: profile, temporalAdapter: makeTemporal() }));

      // Dropping the same round again should cause DUPLICATE_ROUND
      const result = store.dropRound(
        { type: 'CATALOG_ROUND', roundRef: roundCatalog[0] },
        { date: '2026-06-15', venueId: 'V2', index: 0 },
      );
      expect(result.ok).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('removeRound', () => {
    it('removes a round from the profile', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [
                { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32' },
              ],
            },
          ],
        },
      ];
      const store = new ProfileStore(makeConfig({ initialProfile: profile }));
      store.removeRound({
        date: '2026-06-15',
        venueId: 'V1',
        index: 0,
        roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 },
      });
      expect(store.getState().profileDraft[0].venues[0].rounds).toHaveLength(0);
    });
  });

  describe('setNotBeforeTime', () => {
    it('sets notBeforeTime on a round', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [
                { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32' },
              ],
            },
          ],
        },
      ];
      const store = new ProfileStore(makeConfig({ initialProfile: profile }));
      const locator = {
        date: '2026-06-15',
        venueId: 'V1',
        index: 0,
        roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 },
      };
      store.setNotBeforeTime(locator, '10:00');
      expect(store.getState().profileDraft[0].venues[0].rounds[0].notBeforeTime).toBe('10:00');
    });

    it('removes notBeforeTime when undefined', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: '2026-06-15',
          venues: [
            {
              venueId: 'V1',
              rounds: [
                { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32', notBeforeTime: '10:00' },
              ],
            },
          ],
        },
      ];
      const store = new ProfileStore(makeConfig({ initialProfile: profile }));
      const locator = {
        date: '2026-06-15',
        venueId: 'V1',
        index: 0,
        roundKey: { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5 },
      };
      store.setNotBeforeTime(locator, undefined);
      expect(store.getState().profileDraft[0].venues[0].rounds[0].notBeforeTime).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on state change', () => {
      const store = new ProfileStore(makeConfig());
      const listener = vi.fn();
      store.subscribe(listener);

      store.selectDate('2026-06-16');
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].selectedDate).toBe('2026-06-16');
    });

    it('returns unsubscribe function', () => {
      const store = new ProfileStore(makeConfig());
      const listener = vi.fn();
      const unsub = store.subscribe(listener);

      unsub();
      store.selectDate('2026-06-16');
      // listener was called during subscribe time but not after unsub
      const callCount = listener.mock.calls.length;
      store.selectDate('2026-06-17');
      expect(listener.mock.calls.length).toBe(callCount);
    });
  });

  describe('catalog controls', () => {
    it('updates search query', () => {
      const store = new ProfileStore(makeConfig());
      store.setCatalogSearch('boys');
      expect(store.getState().catalogSearchQuery).toBe('boys');
    });

    it('updates groupBy', () => {
      const store = new ProfileStore(makeConfig());
      store.setCatalogGroupBy('draw');
      expect(store.getState().catalogGroupBy).toBe('draw');
    });
  });

  describe('getSchedulingProfile', () => {
    it('returns a deep copy', () => {
      const profile: SchedulingProfile = [
        { scheduleDate: '2026-06-15', venues: [{ venueId: 'V1', rounds: [] }] },
      ];
      const store = new ProfileStore(makeConfig({ initialProfile: profile }));
      const copy = store.getSchedulingProfile();
      copy[0].scheduleDate = '9999-01-01';
      expect(store.getState().profileDraft[0].scheduleDate).toBe('2026-06-15');
    });
  });
});
