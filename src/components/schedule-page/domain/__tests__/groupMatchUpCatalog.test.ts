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
      item({ matchUpId: 'd', eventName: 'Womens', scheduledTime: '07:00' }),
    ];

    const groups = [...groupMatchUpCatalog(items, 'event').keys()];

    expect(groups).toEqual(['Womens', 'Mens', 'Mixed']);
  });

  it('sinks groups with no scheduledTime to the bottom', () => {
    const items = [
      item({ matchUpId: 'a', eventName: 'Z later', scheduledTime: '09:00' }),
      item({ matchUpId: 'b', eventName: 'A unscheduled' }),
      item({ matchUpId: 'c', eventName: 'B earlier', scheduledTime: '08:00' }),
    ];

    const groups = [...groupMatchUpCatalog(items, 'event').keys()];

    expect(groups).toEqual(['B earlier', 'Z later', 'A unscheduled']);
  });

  it('breaks ties with natural-numeric alpha sort on the key', () => {
    const items = [
      item({ matchUpId: 'r10', roundName: 'Round 10', scheduledTime: '08:00' }),
      item({ matchUpId: 'r2', roundName: 'Round 2', scheduledTime: '08:00' }),
      item({ matchUpId: 'r1', roundName: 'Round 1', scheduledTime: '08:00' }),
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
      item({ matchUpId: 'c', scheduledTime: '10:00' }),
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
      item({ matchUpId: 'c' }),
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
        structureId: 'guid-1234',
      }),
    ];

    const groups = [...groupMatchUpCatalog(items, 'structure').keys()];

    expect(groups).toEqual(['Mens Doubles — Consolation Bracket']);
  });

  it('falls back to a labeled stage when structureName is absent', () => {
    const items = [
      item({ matchUpId: 'a', eventName: MENS_DOUBLES, stage: 'CONSOLATION', structureId: 'guid' }),
    ];

    const groups = [...groupMatchUpCatalog(items, 'structure').keys()];

    expect(groups).toEqual(['Mens Doubles — Consolation']);
  });

  it("shows just the eventName when the structure is MAIN (no suffix, never a GUID)", () => {
    const items = [
      item({ matchUpId: 'a', eventName: MENS_DOUBLES, stage: 'MAIN', structureId: 'guid' }),
    ];

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
        stage: 'MAIN',
      }),
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
      item({ matchUpId: 'b', roundName: 'Round 2', sides: BOTH }),
    ];

    const groups = [...groupMatchUpCatalog(items, 'round').keys()];

    expect(groups).toEqual(['Round 2', 'Round 1']);
  });

  it('ranks fully-ready groups above partial above TBD', () => {
    const items = [
      item({ matchUpId: 'a', roundName: 'All TBD', sides: NONE }),
      item({ matchUpId: 'b', roundName: 'One side', sides: ONE }),
      item({ matchUpId: 'c', roundName: 'Both sides', sides: BOTH }),
    ];

    const groups = [...groupMatchUpCatalog(items, 'round').keys()];

    expect(groups).toEqual(['Both sides', 'One side', 'All TBD']);
  });

  it('a scheduled TBD group still sinks below an unscheduled ready group', () => {
    const items = [
      item({ matchUpId: 'a', roundName: 'Scheduled TBD', sides: NONE, scheduledTime: '08:00' }),
      item({ matchUpId: 'b', roundName: 'Unscheduled ready', sides: BOTH }),
    ];

    const groups = [...groupMatchUpCatalog(items, 'round').keys()];

    expect(groups).toEqual(['Unscheduled ready', 'Scheduled TBD']);
  });

  it('within a group, ready matches float above TBD ones (stable otherwise)', () => {
    const items = [
      item({ matchUpId: 'tbd1', roundName: 'R1', sides: NONE }),
      item({ matchUpId: 'ready', roundName: 'R1', sides: BOTH }),
      item({ matchUpId: 'tbd2', roundName: 'R1', sides: NONE }),
      item({ matchUpId: 'partial', roundName: 'R1', sides: ONE }),
    ];

    const order = groupMatchUpCatalog(items, 'round').get('R1')!.map((i) => i.matchUpId);

    expect(order).toEqual(['ready', 'partial', 'tbd1', 'tbd2']);
  });
});
