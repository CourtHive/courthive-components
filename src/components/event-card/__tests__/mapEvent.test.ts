import { mapEventToCardData } from '../mapEvent';
import { describe, it, expect } from 'vitest';

const NOW = new Date('2026-05-17T12:00:00Z');

describe('mapEventToCardData', () => {
  it('maps identity + normalizes eventType + gender', () => {
    const out = mapEventToCardData(
      { eventId: 'e1', eventName: 'Boys U16 Singles', eventType: 'SINGLES', gender: 'M' },
      { now: NOW }
    );
    expect(out.eventId).toBe('e1');
    expect(out.eventType).toBe('SINGLES');
    expect(out.gender).toBe('MALE');
  });

  it('normalizes mixed-case gender shorthands', () => {
    expect(mapEventToCardData({ eventId: 'e1', gender: 'F' }).gender).toBe('FEMALE');
    expect(mapEventToCardData({ eventId: 'e1', gender: 'X' }).gender).toBe('MIXED');
    expect(mapEventToCardData({ eventId: 'e1', gender: 'mixed' }).gender).toBe('MIXED');
  });

  it('derives categoryLabel from age range', () => {
    const out = mapEventToCardData({
      eventId: 'e1',
      category: { ageMin: 14, ageMax: 16 }
    });
    expect(out.categoryLabel).toBe('Age 14–16');
  });

  it('skips matchUp walk in lightMode', () => {
    const event = {
      eventId: 'e1',
      drawDefinitions: [
        {
          structures: [
            { matchUps: [{ winningSide: 1 }, { winningSide: 0, schedule: { scheduledTime: '12:00' } }] }
          ]
        }
      ]
    };
    const out = mapEventToCardData(event, { lightMode: true, now: NOW });
    expect(out.matchUpCounts).toBeUndefined();
  });

  it('walks matchUps when not lightMode', () => {
    const event = {
      eventId: 'e1',
      drawDefinitions: [
        {
          drawId: 'd1',
          structures: [
            {
              structureId: 's1',
              matchUps: [
                { matchUpId: 'm1', winningSide: 1 },
                { matchUpId: 'm2', winningSide: 0, schedule: { scheduledTime: '12:00' } },
                { matchUpId: 'm3', matchUpStatus: 'IN_PROGRESS' }
              ]
            }
          ]
        }
      ]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.matchUpCounts).toEqual({ total: 3, completed: 1, scheduled: 1, inProgress: 1 });
  });

  // Regression: Round Robin draws nest real matchUps in `structure.structures[].matchUps`
  // (CONTAINER -> ITEM groups). The hand-rolled walker only iterated
  // `draw.structures[].matchUps` and missed every RR matchUp; the factory's
  // `allEventMatchUps` walks the nested ITEM groups correctly.
  it('counts matchUps nested inside RR CONTAINER->ITEM structures', () => {
    const event = {
      eventId: 'e-rr',
      drawDefinitions: [
        {
          drawId: 'd-rr',
          drawType: 'ROUND_ROBIN',
          structures: [
            {
              structureId: 's-main',
              structureType: 'CONTAINER',
              stage: 'MAIN',
              matchUps: [],
              structures: [
                {
                  structureId: 's-grp-1',
                  structureType: 'ITEM',
                  stage: 'MAIN',
                  matchUps: [
                    { matchUpId: 'g1-r1', winningSide: 1 },
                    { matchUpId: 'g1-r2', winningSide: 2 },
                    { matchUpId: 'g1-r3', winningSide: 1 }
                  ]
                },
                {
                  structureId: 's-grp-2',
                  structureType: 'ITEM',
                  stage: 'MAIN',
                  matchUps: [
                    { matchUpId: 'g2-r1', winningSide: 1 },
                    { matchUpId: 'g2-r2', winningSide: 2 },
                    { matchUpId: 'g2-r3', matchUpStatus: 'IN_PROGRESS' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.matchUpCounts).toEqual({ total: 6, completed: 5, scheduled: 0, inProgress: 1 });
  });

  // Regression: when an event has both a fully-completed RR draw and an unstarted
  // SE draw, the event card aggregates across them. The hand-rolled walker
  // reported 0/15 (missed the RR entirely + counted only the SE); the factory
  // path reports 36/51 (or, in this small fixture, 6/9).
  it('aggregates matchUp counts across multiple drawDefinitions within an event', () => {
    const event = {
      eventId: 'e-mix',
      drawDefinitions: [
        // RR — 6 matchUps, all completed, nested in CONTAINER->ITEM
        {
          drawId: 'd-rr',
          drawType: 'ROUND_ROBIN',
          structures: [
            {
              structureId: 's-rr-main',
              structureType: 'CONTAINER',
              stage: 'MAIN',
              matchUps: [],
              structures: [
                {
                  structureId: 's-rr-grp',
                  structureType: 'ITEM',
                  stage: 'MAIN',
                  matchUps: [
                    { matchUpId: 'r1', winningSide: 1 },
                    { matchUpId: 'r2', winningSide: 2 },
                    { matchUpId: 'r3', winningSide: 1 },
                    { matchUpId: 'r4', winningSide: 2 },
                    { matchUpId: 'r5', winningSide: 1 },
                    { matchUpId: 'r6', winningSide: 2 }
                  ]
                }
              ]
            }
          ]
        },
        // SE — 3 matchUps, all unstarted/TO_BE_PLAYED
        {
          drawId: 'd-se',
          drawType: 'SINGLE_ELIMINATION',
          structures: [
            {
              structureId: 's-se-main',
              structureType: 'ITEM',
              stage: 'MAIN',
              matchUps: [
                { matchUpId: 's1', matchUpStatus: 'TO_BE_PLAYED' },
                { matchUpId: 's2', matchUpStatus: 'TO_BE_PLAYED' },
                { matchUpId: 's3', matchUpStatus: 'TO_BE_PLAYED' }
              ]
            }
          ]
        }
      ]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.matchUpCounts).toEqual({ total: 9, completed: 6, scheduled: 0, inProgress: 0 });
  });

  it('respects matchUpStats override', () => {
    const out = mapEventToCardData(
      { eventId: 'e1' },
      { matchUpStats: { total: 10, completed: 5, scheduled: 2, inProgress: 1 } }
    );
    expect(out.matchUpCounts?.total).toBe(10);
  });

  it('resolves Live status when matchUps in progress', () => {
    const event = {
      eventId: 'e1',
      startDate: '2026-05-15',
      endDate: '2026-05-20',
      drawDefinitions: [
        { structures: [{ matchUps: [{ matchUpStatus: 'IN_PROGRESS' }] }] }
      ]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.status?.kind).toBe('live');
  });

  it('resolves Drawing status when DRAFT_STATE extension is present', () => {
    const event = {
      eventId: 'e1',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      drawDefinitions: [
        { extensions: [{ name: 'DRAFT_STATE', value: { status: 'COLLECTING_PREFERENCES' } }] }
      ]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.status?.kind).toBe('drawing');
  });

  it('resolves Drawing status when seedsOnly automation present', () => {
    const event = {
      eventId: 'e1',
      drawDefinitions: [{ automated: { seedsOnly: true } }]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.status?.kind).toBe('drawing');
  });

  it('resolves Entries Open when no draws and accepted entries exist', () => {
    const event = {
      eventId: 'e1',
      entries: [{ entryStatus: 'DIRECT_ACCEPTANCE' }, { entryStatus: 'WC' }]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.status?.kind).toBe('entries-open');
    expect(out.entryCount).toBe(2);
  });

  it('resolves Completed when all matchUps won', () => {
    const event = {
      eventId: 'e1',
      drawDefinitions: [
        { structures: [{ matchUps: [{ winningSide: 1 }, { winningSide: 2 }] }] }
      ]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.status?.kind).toBe('completed');
  });

  it('resolves Cancelled when all draws cancelled', () => {
    const event = {
      eventId: 'e1',
      drawDefinitions: [{ drawStatus: 'CANCELLED' }, { drawStatus: 'CANCELLED' }]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.status?.kind).toBe('cancelled');
  });

  it('uses parent tournament sport as court-SVG fallback', () => {
    const out = mapEventToCardData({ eventId: 'e1' }, { sport: 'tennis' });
    expect(out.courtSvgSport).toBe('tennis');
  });
});
