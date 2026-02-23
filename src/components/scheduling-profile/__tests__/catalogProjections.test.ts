import { describe, it, expect } from 'vitest';
import { filterCatalog, groupCatalog, getPlannedRoundKeys } from '../domain/catalogProjections';
import type { CatalogRoundItem } from '../types';

const catalog: CatalogRoundItem[] = [
  { tournamentId: 'T1', eventId: 'E1', eventName: 'Boys U16 Singles', drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 5, roundName: 'R32', matchCountEstimate: 16 },
  { tournamentId: 'T1', eventId: 'E1', eventName: 'Boys U16 Singles', drawId: 'D1', drawName: 'Main', structureId: 'S1', roundNumber: 6, roundName: 'R16', matchCountEstimate: 8 },
  { tournamentId: 'T1', eventId: 'E2', eventName: 'Girls U16 Singles', drawId: 'D2', drawName: 'Main', structureId: 'S2', roundNumber: 5, roundName: 'R32', matchCountEstimate: 16 },
];

describe('filterCatalog', () => {
  it('returns all items with empty query', () => {
    const result = filterCatalog(catalog, '', new Set());
    expect(result).toHaveLength(3);
  });

  it('filters by query string', () => {
    const result = filterCatalog(catalog, 'girls', new Set());
    expect(result).toHaveLength(1);
    expect(result[0].eventName).toBe('Girls U16 Singles');
  });

  it('marks planned items', () => {
    const planned = new Set(['T1|E1|D1|S1|5']);
    const result = filterCatalog(catalog, '', planned);
    expect(result[0].isPlanned).toBe(true);
    expect(result[1].isPlanned).toBe(false);
  });

  it('is case-insensitive', () => {
    const result = filterCatalog(catalog, 'BOYS', new Set());
    expect(result).toHaveLength(2);
  });
});

describe('groupCatalog', () => {
  it('groups by event', () => {
    const items = filterCatalog(catalog, '', new Set());
    const groups = groupCatalog(items, 'event');
    expect(groups.size).toBe(2);
    expect(groups.get('Boys U16 Singles')).toHaveLength(2);
    expect(groups.get('Girls U16 Singles')).toHaveLength(1);
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
    expect(keys).toEqual(['Boys U16 Singles', 'Girls U16 Singles']);
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
    expect(keys.has('T1|E1|D1|S1|5')).toBe(true);
  });
});
