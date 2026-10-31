import { describe, expect, it } from 'vitest';

import { groupMatchUpCatalog } from '../matchUpCatalogProjections';
import type { CatalogMatchUpItem } from '../../types';

// Repeated string literal used across the structure-label cases —
// extracted to satisfy sonarjs/no-duplicate-string.
const MENS_DOUBLES = 'Mens Doubles';

// Slim factory for the test items so each case below stays focused on
// the grouping/sort behavior under test.
function item(overrides: Partial<CatalogMatchUpItem>): CatalogMatchUpItem {
  return {
    matchUpId: overrides.matchUpId ?? 'm',
    eventId: overrides.eventId ?? 'e',
    eventName: overrides.eventName ?? 'Event',
    drawId: overrides.drawId ?? 'd',
    drawName: overrides.drawName,
    structureId: overrides.structureId ?? 's',
    structureName: overrides.structureName,
    stage: overrides.stage,
    roundNumber: overrides.roundNumber ?? 1,
    roundName: overrides.roundName,
    matchUpStatus: overrides.matchUpStatus,
    sides: overrides.sides,
    isScheduled: overrides.isScheduled ?? false,
    scheduledTime: overrides.scheduledTime,
    scheduledCourtName: overrides.scheduledCourtName,
    readinessRank: overrides.readinessRank
  };
}

// Side-readiness fixtures: both participants present, one present, or TBD v TBD.
const BOTH = [{ participantId: 'p1' }, { participantId: 'p2' }];
const ONE = [{ participantId: 'p1' }, {}];
const NONE = [{}, {}];

describe('groupMatchUpCatalog — smart sort', () => {
  it('sorts top-line groups by the earliest scheduledTime in each group', () => {
    const items = [
      item({ matchUpId: 'a', eventName: 'Womens', scheduledTime: '11:00' }),
      item({ matchUpId: 'b', eventName: 'Mens', scheduledTime: '08:30' }),
      item({ matchUpId: 'c', eventName: 'Mixed', scheduledTime: '10:00' }),
      // Earlier same-group item should pull the group earlier than its peers
      item({ matchUpId: 'd', eventName: 'Womens', scheduledTime: '07:00' })
    ];

    const groups = [...groupMatchUpCatalog(items, 'event').keys()];

    expect(groups).toEqual(['Womens', 'Mens', 'Mixed']);
  });

  it('sinks groups with no scheduledTime to the bottom', () => {
    const items = [
      item({ matchUpId: 'a', eventName: 'Z later', scheduledTime: '09:00' }),
      item({ matchUpId: 'b', eventName: 'A unscheduled' }),
      item({ matchUpId: 'c', eventName: 'B earlier', scheduledTime: '08:00' })
    ];

    const groups = [...groupMatchUpCatalog(items, 'event').keys()];

    expect(groups).toEqual(['B earlier', 'Z later', 'A unscheduled']);
  });

  it('breaks ties with natural-numeric alpha sort on the key', () => {
    const items = [
      item({ matchUpId: 'r10', roundName: 'Round 10', scheduledTime: '08:00' }),
      item({ matchUpId: 'r2', roundName: 'Round 2', scheduledTime: '08:00' }),
      item({ matchUpId: 'r1', roundName: 'Round 1', scheduledTime: '08:00' })
    ];

    const groups = [...groupMatchUpCatalog(items, 'round').keys()];

    expect(groups).toEqual(['Round 1', 'Round 2', 'Round 10']);
  });
});

describe("groupMatchUpCatalog — 'time' grouping", () => {
  it('groups items by their scheduledTime', () => {
    const items = [
      item({ matchUpId: 'a', scheduledTime: '08:30' }),
      item({ matchUpId: 'b', scheduledTime: '08:30' }),
      item({ matchUpId: 'c', scheduledTime: '10:00' })
    ];

    const groups = groupMatchUpCatalog(items, 'time');

    expect([...groups.keys()]).toEqual(['08:30', '10:00']);
    expect(groups.get('08:30')!.map((i) => i.matchUpId)).toEqual(['a', 'b']);
    expect(groups.get('10:00')!.map((i) => i.matchUpId)).toEqual(['c']);
  });

  it('collects items with no scheduledTime under a single "Unscheduled" key', () => {
    const items = [
      item({ matchUpId: 'a', scheduledTime: '08:30' }),
      item({ matchUpId: 'b' }),
      item({ matchUpId: 'c' })
    ];

    const groups = groupMatchUpCatalog(items, 'time');

    expect([...groups.keys()]).toEqual(['08:30', 'Unscheduled']);
    expect(groups.get('Unscheduled')!.map((i) => i.matchUpId)).toEqual(['b', 'c']);
  });
});

describe("groupMatchUpCatalog — 'structure' label", () => {
  it('uses the factory structureName when present', () => {
    const items = [
      item({
        matchUpId: 'a',
        eventName: MENS_DOUBLES,
        structureName: 'Consolation Bracket',
        structureId: 'guid-1234'
      })
    ];

    const groups = [...groupMatchUpCatalog(items, 'structure').keys()];

    expect(groups).toEqual(['Mens Doubles — Consolation Bracket']);
  });

  it('falls back to a labeled stage when structureName is absent', () => {
    const items = [item({ matchUpId: 'a', eventName: MENS_DOUBLES, stage: 'CONSOLATION', structureId: 'guid' })];

    const groups = [...groupMatchUpCatalog(items, 'structure').keys()];

    expect(groups).toEqual(['Mens Doubles — Consolation']);
  });

  it('shows just the eventName when the structure is MAIN (no suffix, never a GUID)', () => {
    const items = [item({ matchUpId: 'a', eventName: MENS_DOUBLES, stage: 'MAIN', structureId: 'guid' })];

    const groups = [...groupMatchUpCatalog(items, 'structure').keys()];

    expect(groups).toEqual([MENS_DOUBLES]);
  });

  it('shows just the eventName when neither structureName nor stage is set', () => {
    const items = [item({ matchUpId: 'a', eventName: MENS_DOUBLES, structureId: 'guid' })];

    const groups = [...groupMatchUpCatalog(items, 'structure').keys()];

    expect(groups).toEqual([MENS_DOUBLES]);
  });

  it('never leaks a raw structureId into the group label', () => {
    const items = [
      item({
        matchUpId: 'a',
        eventName: "Men's Doubles",
        structureId: '2d34ce78-a142-456d-8354-ef2899696a77',
        stage: 'MAIN'
      })
    ];

    const groups = [...groupMatchUpCatalog(items, 'structure').keys()];

    expect(groups[0]).toBe("Men's Doubles");
    expect(groups[0]).not.toContain('2d34ce78');
  });
});

describe('groupMatchUpCatalog — readiness sort', () => {
  it('floats groups with real participants above all-TBD groups, even if TBD sorts earlier by key', () => {
    const items = [
      item({ matchUpId: 'a', roundName: 'Round 1', sides: NONE }),
      item({ matchUpId: 'b', roundName: 'Round 2', sides: BOTH })
    ];

    const groups = [...groupMatchUpCatalog(items, 'round').keys()];

    expect(groups).toEqual(['Round 2', 'Round 1']);
  });

  it('ranks fully-ready groups above partial above TBD', () => {
    const items = [
      item({ matchUpId: 'a', roundName: 'All TBD', sides: NONE }),
      item({ matchUpId: 'b', roundName: 'One side', sides: ONE }),
      item({ matchUpId: 'c', roundName: 'Both sides', sides: BOTH })
    ];

    const groups = [...groupMatchUpCatalog(items, 'round').keys()];

    expect(groups).toEqual(['Both sides', 'One side', 'All TBD']);
  });

  it('a scheduled TBD group still sinks below an unscheduled ready group', () => {
    const items = [
      item({ matchUpId: 'a', roundName: 'Scheduled TBD', sides: NONE, scheduledTime: '08:00' }),
      item({ matchUpId: 'b', roundName: 'Unscheduled ready', sides: BOTH })
    ];

    const groups = [...groupMatchUpCatalog(items, 'round').keys()];

    expect(groups).toEqual(['Unscheduled ready', 'Scheduled TBD']);
  });

  it('within a group, ready matches float above TBD ones (stable otherwise)', () => {
    const items = [
      item({ matchUpId: 'tbd1', roundName: 'R1', sides: NONE }),
      item({ matchUpId: 'ready', roundName: 'R1', sides: BOTH }),
      item({ matchUpId: 'tbd2', roundName: 'R1', sides: NONE }),
      item({ matchUpId: 'partial', roundName: 'R1', sides: ONE })
    ];

    const order = groupMatchUpCatalog(items, 'round')
      .get('R1')!
      .map((i) => i.matchUpId);

    expect(order).toEqual(['ready', 'partial', 'tbd1', 'tbd2']);
  });
});

describe('groupMatchUpCatalog — structure before readiness', () => {
  const keys = (items: CatalogMatchUpItem[], mode: Parameters<typeof groupMatchUpCatalog>[1]) => [
    ...groupMatchUpCatalog(items, mode).keys()
  ];

  it('keeps rounds in draw order even when a later round is the readier', () => {
    const items = [
      item({ matchUpId: 'sf', roundName: 'SF', roundNumber: 4, sides: BOTH, readinessRank: 0 }),
      item({ matchUpId: 'r16', roundName: 'R16', roundNumber: 2, sides: NONE }),
      item({ matchUpId: 'qf', roundName: 'QF', roundNumber: 3, sides: ONE }),
      item({ matchUpId: 'r32', roundName: 'R32', roundNumber: 1, sides: BOTH, readinessRank: 5000 })
    ];
    // By label this would be QF, R16, R32, SF; by readiness SF first. Neither is the structure.
    expect(keys(items, 'round')).toEqual(['R32', 'R16', 'QF', 'SF']);
  });

  it('puts qualifying rounds before main-draw rounds', () => {
    const items = [
      item({ matchUpId: 'main', roundName: 'R32', roundNumber: 1, stage: 'MAIN', sides: BOTH }),
      item({ matchUpId: 'q', roundName: 'Q1', roundNumber: 1, stage: 'QUALIFYING', sides: NONE })
    ];
    expect(keys(items, 'round')).toEqual(['Q1', 'R32']);
  });

  it('orders time groups by the clock, not by readiness, with Unscheduled last', () => {
    const items = [
      item({ matchUpId: 'u', sides: BOTH, readinessRank: 0 }),
      item({ matchUpId: 'late', scheduledTime: '10:00', sides: BOTH, readinessRank: 0 }),
      item({ matchUpId: 'early', scheduledTime: '08:00', sides: NONE })
    ];
    expect(keys(items, 'time')).toEqual(['08:00', '10:00', 'Unscheduled']);
  });

  it('keeps an event’s structures together, qualifying → main → consolation', () => {
    const items = [
      item({ matchUpId: 'ac', eventId: 'A', eventName: 'A', stage: 'CONSOLATION', sides: BOTH, readinessRank: 0 }),
      item({ matchUpId: 'bm', eventId: 'B', eventName: 'B', stage: 'MAIN', sides: BOTH, readinessRank: 10 }),
      item({ matchUpId: 'am', eventId: 'A', eventName: 'A', stage: 'MAIN', sides: NONE }),
      item({ matchUpId: 'aq', eventId: 'A', eventName: 'A', stage: 'QUALIFYING', sides: NONE })
    ];
    // Event A is placed first by its readiest structure (consolation, rank 0); within A, structure decides.
    expect(keys(items, 'structure')).toEqual(['A — Qualifying', 'A', 'A — Consolation', 'B']);
  });
});

describe('groupMatchUpCatalog — readinessRank', () => {
  it('orders groups with no structural order by their readiest matchUp', () => {
    const items = [
      item({ matchUpId: 'a', eventName: 'Alpha', sides: BOTH, readinessRank: 40 }),
      item({ matchUpId: 'b', eventName: 'Bravo', sides: BOTH, readinessRank: 3 }),
      item({ matchUpId: 'c', eventName: 'Charlie', sides: BOTH })
    ];
    expect([...groupMatchUpCatalog(items, 'event').keys()]).toEqual(['Bravo', 'Alpha', 'Charlie']);
  });

  it('never lets a rank outrank side readiness', () => {
    const items = [
      item({ matchUpId: 'tbd', eventName: 'Alpha', sides: ONE, readinessRank: 0 }),
      item({ matchUpId: 'real', eventName: 'Bravo', sides: BOTH, readinessRank: 9000 })
    ];
    expect([...groupMatchUpCatalog(items, 'event').keys()]).toEqual(['Bravo', 'Alpha']);
  });

  it('orders matchUps within a group by rank after side readiness, stable otherwise', () => {
    const items = [
      item({ matchUpId: 'slow', sides: BOTH, readinessRank: 30 }),
      item({ matchUpId: 'tbd', sides: NONE, readinessRank: 0 }),
      item({ matchUpId: 'unranked', sides: BOTH }),
      item({ matchUpId: 'fast', sides: BOTH, readinessRank: 0 }),
      item({ matchUpId: 'unranked2', sides: BOTH })
    ];
    const order = groupMatchUpCatalog(items, 'event')
      .get('Event')!
      .map((i) => i.matchUpId);
    expect(order).toEqual(['fast', 'slow', 'unranked', 'unranked2', 'tbd']);
  });
});
