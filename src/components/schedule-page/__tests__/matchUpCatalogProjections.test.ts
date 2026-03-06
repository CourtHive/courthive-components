import { describe, it, expect } from 'vitest';
import { filterMatchUpCatalog, groupMatchUpCatalog } from '../domain/matchUpCatalogProjections';
import type { CatalogMatchUpItem } from '../types';

const catalog: CatalogMatchUpItem[] = [
  {
    matchUpId: 'M1', eventId: 'E1', eventName: 'Boys U16 Singles', drawId: 'D1', drawName: 'Main',
    structureId: 'S1', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', isScheduled: false,
    sides: [{ participantName: 'Alice Smith' }, { participantName: 'Bob Jones' }],
  },
  {
    matchUpId: 'M2', eventId: 'E1', eventName: 'Boys U16 Singles', drawId: 'D1', drawName: 'Main',
    structureId: 'S1', roundNumber: 2, roundName: 'R16', matchUpType: 'SINGLES', isScheduled: true,
    scheduledTime: '10:00', scheduledCourtName: 'Court 1',
    sides: [{ participantName: 'Charlie Brown' }, { participantName: 'David Lee' }],
  },
  {
    matchUpId: 'M3', eventId: 'E2', eventName: 'Girls U16 Singles', drawId: 'D2', drawName: 'Main',
    structureId: 'S2', roundNumber: 1, roundName: 'R32', matchUpType: 'SINGLES', isScheduled: false,
    sides: [{ participantName: 'Eve Wilson' }, { participantName: 'Fay Miller' }],
  },
];

describe('filterMatchUpCatalog', () => {
  it('returns all items with empty query', () => {
    const result = filterMatchUpCatalog(catalog, '');
    expect(result).toHaveLength(3);
  });

  it('filters by participant name', () => {
    const result = filterMatchUpCatalog(catalog, 'alice');
    expect(result).toHaveLength(1);
    expect(result[0].matchUpId).toBe('M1');
  });

  it('filters by event name', () => {
    const result = filterMatchUpCatalog(catalog, 'girls');
    expect(result).toHaveLength(1);
    expect(result[0].matchUpId).toBe('M3');
  });

  it('is case-insensitive', () => {
    const result = filterMatchUpCatalog(catalog, 'BOYS');
    expect(result).toHaveLength(2);
  });

  describe('scheduled behavior', () => {
    it('dim behavior keeps all items (default)', () => {
      const result = filterMatchUpCatalog(catalog, '');
      expect(result).toHaveLength(3);
    });

    it('hide behavior filters out scheduled items', () => {
      const result = filterMatchUpCatalog(catalog, '', 'hide');
      expect(result).toHaveLength(2);
      expect(result.every((r) => !r.isScheduled)).toBe(true);
    });

    it('hide + query filters correctly', () => {
      const result = filterMatchUpCatalog(catalog, 'boys', 'hide');
      expect(result).toHaveLength(1);
      expect(result[0].matchUpId).toBe('M1');
    });
  });
});

describe('groupMatchUpCatalog', () => {
  it('groups by event', () => {
    const groups = groupMatchUpCatalog(catalog, 'event');
    expect(groups.size).toBe(2);
    expect(groups.get('Boys U16 Singles')).toHaveLength(2);
    expect(groups.get('Girls U16 Singles')).toHaveLength(1);
  });

  it('groups by draw', () => {
    const groups = groupMatchUpCatalog(catalog, 'draw');
    expect(groups.size).toBe(2);
  });

  it('groups by round', () => {
    const groups = groupMatchUpCatalog(catalog, 'round');
    expect(groups.size).toBe(2);
    expect(groups.get('R32')).toHaveLength(2);
    expect(groups.get('R16')).toHaveLength(1);
  });

  it('groups by structure', () => {
    const groups = groupMatchUpCatalog(catalog, 'structure');
    expect(groups.size).toBe(2);
  });

  it('sorts group keys alphabetically', () => {
    const groups = groupMatchUpCatalog(catalog, 'event');
    const keys = [...groups.keys()];
    expect(keys).toEqual(['Boys U16 Singles', 'Girls U16 Singles']);
  });
});
