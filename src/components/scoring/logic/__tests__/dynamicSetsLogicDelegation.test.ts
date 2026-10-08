import { getMaxAllowedScore, isSetComplete } from '../dynamicSetsLogic';
import { matchUpFormatCode } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

import type { MatchUpConfig } from '../dynamicSetsLogic';

const TB10 = 'SET1-S:TB10';
const S5_WB1 = 'SET1-S:5WB1';
const S6_ADVANTAGE = 'SET1-S:6';
const S6_TB7 = 'SET3-S:6/TB7';
const S8_TB7 = 'SET1-S:8/TB7';
const cfg = (format: string): MatchUpConfig => matchUpFormatCode.parse(format) as unknown as MatchUpConfig;
const max = (format: string, opp: number) => getMaxAllowedScore(0, 1, { side1: 0, side2: opp }, cfg(format));

describe('getMaxAllowedScore delegates to the factory', () => {
  it('a match tiebreak to ten is capped in POINTS, not six games (the live defect: 7)', () => {
    expect(max(TB10, 0)).toBe(10);
    expect(max(TB10, 8)).toBe(10);
    expect(max(TB10, 10)).toBe(12);
    expect(max('SET1-S:TB7NOAD', 6)).toBe(7);
  });

  it('a win-by-one set ends at setTo', () => {
    expect(max(S5_WB1, 0)).toBe(5);
    expect(max(S5_WB1, 4)).toBe(5);
  });

  it('an advantage set has no ceiling: the margin decides', () => {
    expect(max(S6_ADVANTAGE, 0)).toBe(7);
    expect(max(S6_ADVANTAGE, 4)).toBe(6);
    expect(max(S6_ADVANTAGE, 5)).toBe(7);
    expect(max(S6_ADVANTAGE, 22)).toBe(24);
  });

  it('a tiebreak above setTo is played where the format says', () => {
    expect(max(S8_TB7, 6)).toBe(8);
    expect(max(S8_TB7, 7)).toBe(9);
    expect(max(S8_TB7, 0)).toBe(9);
  });

  it('timed sets have no maximum', () => {
    expect(max('SET1-S:T20', 0)).toBe(Infinity);
  });
});

describe('isSetComplete delegates to the factory', () => {
  it('honours winBy: 1 (the factory gap that kept this hand-rolled is closed)', () => {
    expect(isSetComplete(0, { side1: 5, side2: 4 }, cfg(S5_WB1))).toBe(true);
    expect(isSetComplete(0, { side1: 4, side2: 4 }, cfg(S5_WB1))).toBe(false);
  });

  it("completes a tiebreak set from the loser's points alone, and refuses one without them", () => {
    expect(isSetComplete(0, { side1: 7, side2: 6, tiebreak: 3 }, cfg(S6_TB7))).toBe(true);
    expect(isSetComplete(0, { side1: 7, side2: 6 }, cfg(S6_TB7))).toBe(false);
    expect(isSetComplete(0, { side1: 7, side2: 5 }, cfg(S6_TB7))).toBe(true);
    expect(isSetComplete(0, { side1: 6, side2: 5 }, cfg(S6_TB7))).toBe(false);
  });

  it('an advantage set runs on by two clear games', () => {
    expect(isSetComplete(0, { side1: 8, side2: 6 }, cfg(S6_ADVANTAGE))).toBe(true);
    expect(isSetComplete(0, { side1: 7, side2: 6 }, cfg(S6_ADVANTAGE))).toBe(false);
  });
});
