import { describe, expect, it } from 'vitest';
import {
  elapsedOf,
  eventRoundLabel,
  formatElapsed,
  scheduleInfoOptions,
  servingSideOf,
  sideColorOf
} from '../scoreboardState';

// constants and types
import type { MatchUp } from '../../../types';

const MINUTE = 60_000;
const ONE_PM = '2026-10-26T13:00:00Z';
const matchUp = (overrides: Partial<MatchUp> = {}): MatchUp => ({ matchUpId: 'm', structureId: 's', ...overrides });

describe('scheduleInfoOptions', () => {
  it('reads the object form; true or nothing is the plain header', () => {
    expect(scheduleInfoOptions({ scheduleInfo: { elapsed: true } })).toEqual({ elapsed: true });
    expect(scheduleInfoOptions({ scheduleInfo: true })).toEqual({});
    expect(scheduleInfoOptions(undefined)).toEqual({});
  });
});

describe('sideColorOf', () => {
  it('takes a colour per side from a map or a host function', () => {
    const m = matchUp();
    expect(sideColorOf({ sideColors: { 1: '#0047d4', 2: '#dd5d13' } }, m, 2)).toBe('#dd5d13');
    expect(sideColorOf({ sideColors: ({ sideNumber }) => (sideNumber === 1 ? 'navy' : undefined) }, m, 1)).toBe('navy');
  });

  it('is off without the option, for a side with no colour, and outside sides 1 and 2', () => {
    const m = matchUp();
    expect(sideColorOf({}, m, 1)).toBeUndefined();
    expect(sideColorOf({ sideColors: { 1: '#0047d4' } }, m, 2)).toBeUndefined();
    expect(sideColorOf({ sideColors: { 1: '  ' } }, m, 1)).toBeUndefined();
    expect(sideColorOf({ sideColors: () => 'red' }, m, 3)).toBeUndefined();
  });
});

describe('servingSideOf', () => {
  it('is the server while the matchUp is unfinished', () => {
    expect(servingSideOf(matchUp({ serverSideNumber: 2, matchUpStatus: 'IN_PROGRESS' }))).toBe(2);
  });

  it('is nobody once the matchUp is finished, or when service is not tracked', () => {
    expect(servingSideOf(matchUp({ serverSideNumber: 2, winningSide: 1 }))).toBeUndefined();
    expect(servingSideOf(matchUp({ serverSideNumber: 1, matchUpStatus: 'COMPLETED' }))).toBeUndefined();
    expect(servingSideOf(matchUp({ matchUpStatus: 'IN_PROGRESS' }))).toBeUndefined();
    expect(servingSideOf(matchUp({ serverSideNumber: 3 as any }))).toBeUndefined();
  });
});

describe('elapsedOf', () => {
  const now = Date.parse('2026-10-26T15:00:00Z');

  it("prefers the factory's suspension-aware milliseconds", () => {
    const m = matchUp({ schedule: { milliseconds: 16 * MINUTE, startTime: '2026-10-26T10:00:00Z' } });
    expect(elapsedOf(m, now)).toBe(16 * MINUTE);
  });

  it('counts start to end, or start to now while live', () => {
    const done = matchUp({
      winningSide: 1,
      schedule: { startTime: ONE_PM, endTime: '2026-10-26T14:07:00Z' }
    });
    expect(elapsedOf(done, now)).toBe(67 * MINUTE);
    const live = matchUp({ matchUpStatus: 'IN_PROGRESS', schedule: { startTime: '2026-10-26T14:44:00Z' } });
    expect(elapsedOf(live, now)).toBe(16 * MINUTE);
  });

  it('anchors a bare HH:MM start to the scheduled date', () => {
    const m = matchUp({ schedule: { scheduledDate: '2026-10-26', startTime: '10:00', endTime: '11:30' } });
    expect(elapsedOf(m, now)).toBe(90 * MINUTE);
  });

  it('is undefined before a start, for a finished matchUp with no end, or an end before the start', () => {
    expect(elapsedOf(matchUp({ schedule: { scheduledDate: '2026-10-26' } }), now)).toBeUndefined();
    expect(elapsedOf(matchUp({ winningSide: 2, schedule: { startTime: ONE_PM } }), now)).toBe(undefined);
    const backwards = matchUp({ schedule: { startTime: ONE_PM, endTime: '2026-10-26T12:00:00Z' } });
    expect(elapsedOf(backwards, now)).toBeUndefined();
  });
});

describe('formatElapsed', () => {
  it('is h:mm', () => {
    expect(formatElapsed(16 * MINUTE)).toBe('0:16');
    expect(formatElapsed(67 * MINUTE + 59_000)).toBe('1:07');
    expect(formatElapsed(12 * 60 * MINUTE + 5 * MINUTE)).toBe('12:05');
  });
});

describe('eventRoundLabel', () => {
  it('joins what the matchUp carries', () => {
    expect(eventRoundLabel(matchUp({ eventName: "Men's Singles", roundName: 'R32' }))).toBe("Men's Singles - R32");
    expect(eventRoundLabel(matchUp({ roundName: 'R32' }))).toBe('R32');
    expect(eventRoundLabel(matchUp())).toBe('');
  });
});
