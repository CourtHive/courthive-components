import {
  filterMatchUpCatalog,
  groupMatchUpCatalog,
  computeBaseRoundByEvent
} from '../domain/matchUpCatalogProjections';
import { matchUpSearchKey, memberNamesLabel } from '../domain/utils';
import type { CatalogMatchUpItem } from '../types';
import { describe, it, expect } from 'vitest';

const BOYS_U16_SINGLES = 'Boys U16 Singles';
const GIRLS_U16_SINGLES = 'Girls U16 Singles';

const AIDEN_NAME = 'Aiden Phoebus';

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

/**
 * A DOUBLES item, shaped the way the factory actually hands one over: the PAIR's
 * `participantName` is FAMILY NAMES ONLY, and the given names exist nowhere but
 * `individualParticipants`. This is the item that used to be unfindable by the
 * name an operator reads off a rest row or an entry list.
 */
const DOUBLES_ITEM: CatalogMatchUpItem = {
  matchUpId: 'M4',
  eventId: 'E3',
  eventName: 'Boys U16 Doubles',
  drawId: 'D3',
  drawName: 'Main',
  structureId: 'S3',
  roundNumber: 1,
  roundName: 'R32',
  matchUpType: 'DOUBLES',
  isScheduled: false,
  sides: [
    {
      participantName: 'Phoebus/Smith',
      individualParticipants: [
        { participantId: 'p-aiden', participantName: AIDEN_NAME },
        { participantId: 'p-ravi', participantName: 'Ravi Smith' }
      ]
    },
    {
      participantName: 'Carrasco/Talla',
      individualParticipants: [
        { participantId: 'p-luis', participantName: 'Luis Carrasco' },
        { participantId: 'p-omar', participantName: 'Omar Talla' }
      ]
    }
  ]
};

describe('matchUpSearchKey', () => {
  it('includes the pair name the cell displays', () => {
    expect(matchUpSearchKey(DOUBLES_ITEM)).toContain('phoebus/smith');
  });

  it('includes each member\u2019s own name, which the pair name drops', () => {
    const key = matchUpSearchKey(DOUBLES_ITEM);
    expect(key).toContain('aiden phoebus');
    expect(key).toContain('ravi smith');
  });

  it('finds a doubles matchUp by a member\u2019s FULL name', () => {
    // The defect: `Aiden Phoebus` is not a substring of `Phoebus/Smith`, so this
    // returned nothing and the operator concluded he had no doubles matches.
    const result = filterMatchUpCatalog([DOUBLES_ITEM], AIDEN_NAME);
    expect(result.map((m) => m.matchUpId)).toEqual(['M4']);
  });

  it('still finds a singles matchUp with no members to expand', () => {
    expect(matchUpSearchKey(catalog[0])).toContain('alice smith');
  });

  it('tolerates a side with no members and a member with no name', () => {
    const sparse: CatalogMatchUpItem = {
      ...DOUBLES_ITEM,
      sides: [{ participantName: 'Solo' }, { individualParticipants: [{ participantId: 'p-x' }] }]
    };
    expect(matchUpSearchKey(sparse)).toContain('solo');
  });
});

describe('memberNamesLabel', () => {
  it('spells out a doubles side in full, which is what the tooltip shows', () => {
    expect(memberNamesLabel(DOUBLES_ITEM.sides?.[0])).toBe('Aiden Phoebus / Ravi Smith');
  });

  it('is empty for a singles side, so the caller sets no tooltip at all', () => {
    expect(memberNamesLabel(catalog[0].sides?.[0])).toBe('');
  });

  it('is empty for an absent side and for an un-hydrated pair', () => {
    expect(memberNamesLabel(undefined)).toBe('');
    expect(memberNamesLabel({ participantName: 'Phoebus/Smith' })).toBe('');
  });

  it('drops a member carrying no name rather than emitting a dangling separator', () => {
    const side = { individualParticipants: [{ participantName: AIDEN_NAME }, { participantId: 'p-x' }] };
    expect(memberNamesLabel(side)).toBe(AIDEN_NAME);
  });
});

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
