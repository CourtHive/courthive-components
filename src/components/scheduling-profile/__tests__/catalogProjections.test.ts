import { describe, it, expect } from 'vitest';
import { filterCatalog, groupCatalog, getPlannedRoundKeys } from '../domain/catalogProjections';
import type { CatalogRoundItem } from '../types';

const BOYS_U16 = 'Boys U16 Singles';
const GIRLS_U16 = 'Girls U16 Singles';
const ROUND_KEY_R32 = 'T1|E1|D1|S1|5';

const catalog: CatalogRoundItem[] = [
  { tournamentId: 'T1', eventId: 'E1', eventName: BOYS_U16, drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 5, roundName: 'R32', matchCountEstimate: 16 },
  { tournamentId: 'T1', eventId: 'E1', eventName: BOYS_U16, drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 6, roundName: 'R16', matchCountEstimate: 8 },
  { tournamentId: 'T1', eventId: 'E2', eventName: GIRLS_U16, drawId: 'D2', drawName: 'Main', structureId: 'S2', roundNumber: 5, roundName: 'R32', matchCountEstimate: 16 },
];

describe('filterCatalog', () => {
  it('returns all items with empty query', () => {
    const result = filterCatalog(catalog, '', new Set());
    expect(result).toHaveLength(3);
  });

  it('filters by query string', () => {
    const result = filterCatalog(catalog, 'girls', new Set());
    expect(result).toHaveLength(1);
    expect(result[0].eventName).toBe(GIRLS_U16);
  });

  it('marks planned items', () => {
    const planned = new Set([ROUND_KEY_R32]);
    const result = filterCatalog(catalog, '', planned);
    expect(result[0].isPlanned).toBe(true);
    expect(result[1].isPlanned).toBe(false);
  });

  it('is case-insensitive', () => {
    const result = filterCatalog(catalog, 'BOYS', new Set());
    expect(result).toHaveLength(2);
  });

  describe('behavior parameter', () => {
    const planned = new Set([ROUND_KEY_R32]);

    it('defaults to dim (keeps all items)', () => {
      const result = filterCatalog(catalog, '', planned);
      expect(result).toHaveLength(3);
      expect(result[0].isPlanned).toBe(true);
    });

    it('hide behavior filters out planned items', () => {
      const result = filterCatalog(catalog, '', planned, 'hide');
      expect(result).toHaveLength(2);
      expect(result.every((r) => !r.isPlanned)).toBe(true);
    });

    it('hide behavior filters out planned items with query', () => {
      const result = filterCatalog(catalog, 'boys', planned, 'hide');
      expect(result).toHaveLength(1);
      expect(result[0].roundName).toBe('R16');
    });

    it('dim behavior keeps all items', () => {
      const result = filterCatalog(catalog, '', planned, 'dim');
      expect(result).toHaveLength(3);
    });

    it('navigate behavior keeps all items', () => {
      const result = filterCatalog(catalog, '', planned, 'navigate');
      expect(result).toHaveLength(3);
      expect(result[0].isPlanned).toBe(true);
    });
  });
});

describe('groupCatalog', () => {
  it('groups by event', () => {
    const items = filterCatalog(catalog, '', new Set());
    const groups = groupCatalog(items, 'event');
    expect(groups.size).toBe(2);
    expect(groups.get(BOYS_U16)).toHaveLength(2);
    expect(groups.get(GIRLS_U16)).toHaveLength(1);
  });

  it('groups by draw', () => {
    const items = filterCatalog(catalog, '', new Set());
    const groups = groupCatalog(items, 'draw');
    expect(groups.size).toBe(2);
  });

  it('groups by round', () => {
    const items = filterCatalog(catalog, '', new Set());
    const groups = groupCatalog(items, 'round');
    expect(groups.size).toBe(2); // R32 and R16
    expect(groups.get('R32')).toHaveLength(2);
    expect(groups.get('R16')).toHaveLength(1);
  });

  it('sorts group keys alphabetically', () => {
    const items = filterCatalog(catalog, '', new Set());
    const groups = groupCatalog(items, 'event');
    const keys = [...groups.keys()];
    expect(keys).toEqual([BOYS_U16, GIRLS_U16]);
  });
});

describe('getPlannedRoundKeys', () => {
  it('extracts keys of non-segmented rounds', () => {
    const profile = [
      {
        scheduleDate: '2026-06-15',
        venues: [
          {
            venueId: 'V1',
            rounds: [
              { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32' },
              { tournamentId: 'T1', eventId: 'E1', drawId: 'D1', structureId: 'S1', roundNumber: 5, roundName: 'R32', roundSegment: { segmentNumber: 1, segmentsCount: 2 } },
            ],
          },
        ],
      },
    ];
    const keys = getPlannedRoundKeys(profile);
    expect(keys.size).toBe(1); // Only the non-segmented one
    expect(keys.has(ROUND_KEY_R32)).toBe(true);
  });
});
