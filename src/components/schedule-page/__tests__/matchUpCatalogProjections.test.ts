import {
  filterMatchUpCatalog,
  groupMatchUpCatalog,
  computeBaseRoundByEvent
} from '../domain/matchUpCatalogProjections';
import type { CatalogMatchUpItem } from '../types';
import { describe, it, expect } from 'vitest';

const BOYS_U16_SINGLES = 'Boys U16 Singles';
const GIRLS_U16_SINGLES = 'Girls U16 Singles';

const catalog: CatalogMatchUpItem[] = [
  {
    matchUpId: 'M1',
    eventId: 'E1',
    eventName: BOYS_U16_SINGLES,
    drawId: 'D1',
    drawName: 'Main',
    structureId: 'S1',
    roundNumber: 1,
    roundName: 'R32',
    matchUpType: 'SINGLES',
    isScheduled: false,
    sides: [{ participantName: 'Alice Smith' }, { participantName: 'Bob Jones' }]
  },
  {
    matchUpId: 'M2',
    eventId: 'E1',
    eventName: BOYS_U16_SINGLES,
    drawId: 'D1',
    drawName: 'Main',
    structureId: 'S1',
    roundNumber: 2,
    roundName: 'R16',
    matchUpType: 'SINGLES',
    isScheduled: true,
    scheduledTime: '10:00',
    scheduledCourtName: 'Court 1',
    sides: [{ participantName: 'Charlie Brown' }, { participantName: 'David Lee' }]
  },
  {
    matchUpId: 'M3',
    eventId: 'E2',
    eventName: GIRLS_U16_SINGLES,
    drawId: 'D2',
    drawName: 'Main',
    structureId: 'S2',
    roundNumber: 1,
    roundName: 'R32',
    matchUpType: 'SINGLES',
    isScheduled: false,
    sides: [{ participantName: 'Eve Wilson' }, { participantName: 'Fay Miller' }]
  }
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
    expect(groups.get(BOYS_U16_SINGLES)).toHaveLength(2);
    expect(groups.get(GIRLS_U16_SINGLES)).toHaveLength(1);
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
    expect(keys).toEqual([BOYS_U16_SINGLES, GIRLS_U16_SINGLES]);
  });
});

// ── computeBaseRoundByEvent ──
// Helper to build a CatalogMatchUpItem with sensible defaults so each test
// only needs to spell out the fields it cares about.
const baseItem = (overrides: Partial<CatalogMatchUpItem> = {}): CatalogMatchUpItem => ({
  matchUpId: overrides.matchUpId ?? 'M',
  eventId: 'E1',
  eventName: 'Event 1',
  drawId: 'D1',
  structureId: 'S1',
  roundNumber: 1,
  isScheduled: false,
  ...overrides
});

describe('computeBaseRoundByEvent', () => {
  it('returns an empty map for an empty catalog', () => {
    expect(computeBaseRoundByEvent([])).toEqual(new Map());
  });

  it('returns an empty map when every item is already scheduled', () => {
    const items = [
      baseItem({ matchUpId: 'M1', roundNumber: 1, isScheduled: true }),
      baseItem({ matchUpId: 'M2', roundNumber: 2, isScheduled: true })
    ];
    expect(computeBaseRoundByEvent(items)).toEqual(new Map());
  });

  it('returns an empty map when every item is completed', () => {
    const items = [
      baseItem({ matchUpId: 'M1', roundNumber: 1, matchUpStatus: 'COMPLETED' }),
      baseItem({ matchUpId: 'M2', roundNumber: 2, matchUpStatus: 'WALKOVER' })
    ];
    expect(computeBaseRoundByEvent(items)).toEqual(new Map());
  });

  it('picks the lowest unscheduled, non-completed round per event', () => {
    const items = [
      baseItem({ matchUpId: 'M1', roundNumber: 3 }),
      baseItem({ matchUpId: 'M2', roundNumber: 2 }),
      baseItem({ matchUpId: 'M3', roundNumber: 5 })
    ];
    const result = computeBaseRoundByEvent(items);
    expect(result.get('E1')).toBe(2);
  });

  it('still picks a round as base when some of its members are already scheduled', () => {
    // The user-confirmed semantic: a partially-scheduled round (R16 with some
    // items placed) still wins as base because there is unfinished work in it.
    const items = [
      baseItem({ matchUpId: 'M1', roundNumber: 2, isScheduled: true }),
      baseItem({ matchUpId: 'M2', roundNumber: 2, isScheduled: false }), // still in R2
      baseItem({ matchUpId: 'M3', roundNumber: 3, isScheduled: false })
    ];
    expect(computeBaseRoundByEvent(items).get('E1')).toBe(2);
  });

  it('tracks each event independently — no bleed across eventIds', () => {
    const items = [
      baseItem({ matchUpId: 'A1', eventId: 'A', roundNumber: 2 }),
      baseItem({ matchUpId: 'A2', eventId: 'A', roundNumber: 5 }),
      baseItem({ matchUpId: 'B1', eventId: 'B', roundNumber: 3 }),
      baseItem({ matchUpId: 'B2', eventId: 'B', roundNumber: 4 })
    ];
    const result = computeBaseRoundByEvent(items);
    expect(result.get('A')).toBe(2);
    expect(result.get('B')).toBe(3);
    expect(result.size).toBe(2);
  });

  it('skips completed items in a round but still selects that round via its unscheduled siblings', () => {
    const items = [
      baseItem({ matchUpId: 'M1', roundNumber: 2, matchUpStatus: 'COMPLETED' }),
      baseItem({ matchUpId: 'M2', roundNumber: 2, isScheduled: false }),
      baseItem({ matchUpId: 'M3', roundNumber: 4 })
    ];
    expect(computeBaseRoundByEvent(items).get('E1')).toBe(2);
  });
});
