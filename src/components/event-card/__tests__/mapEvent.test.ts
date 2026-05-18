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
          structures: [
            {
              matchUps: [
                { winningSide: 1 },
                { winningSide: 0, schedule: { scheduledTime: '12:00' } },
                { matchUpStatus: 'IN_PROGRESS' }
              ]
            }
          ]
        }
      ]
    };
    const out = mapEventToCardData(event, { now: NOW });
    expect(out.matchUpCounts).toEqual({ total: 3, completed: 1, scheduled: 1, inProgress: 1 });
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
