import { describe, it, expect } from 'vitest';

import {
  competitivenessColor,
  competitivenessForMatchUp,
  getCompetitivenessBand,
  COMPETITIVENESS_COLORS,
  NEUTRAL_SEGMENT_COLOR,
  getCompetitivenessFromScoreString
} from '../competitiveness';

const set = (a: number, b: number, t1?: number, t2?: number) => ({
  side1Score: a,
  side2Score: b,
  side1TiebreakScore: t1,
  side2TiebreakScore: t2
});

describe('getCompetitivenessBand', () => {
  it('classifies a lopsided score as DECISIVE', () => {
    // 12 games to 1 -> spread 8% -> DECISIVE (<=20)
    expect(getCompetitivenessBand([set(6, 0), set(6, 1)])).toBe('DECISIVE');
  });

  it('classifies a moderate score as ROUTINE', () => {
    // 12 games to 5 -> spread 42% -> ROUTINE (<=50)
    expect(getCompetitivenessBand([set(6, 2), set(6, 3)])).toBe('ROUTINE');
  });

  it('classifies a tight score as COMPETITIVE', () => {
    // 12 games to 8 -> spread 67% -> COMPETITIVE (>50)
    expect(getCompetitivenessBand([set(6, 4), set(6, 4)])).toBe('COMPETITIVE');
  });

  it('counts a match tiebreak as an extra game for its winner', () => {
    // 1-1 in sets, third "set" is a match tiebreak won by side 1
    const band = getCompetitivenessBand([set(6, 3), set(3, 6), set(0, 0, 10, 7)]);
    expect(band).toBeDefined();
  });

  it('returns undefined when there is nothing to measure', () => {
    expect(getCompetitivenessBand([])).toBeUndefined();
    expect(getCompetitivenessBand(undefined)).toBeUndefined();
    expect(getCompetitivenessBand([set(0, 0)])).toBeUndefined();
  });

  it('honors custom band thresholds', () => {
    // 12-8 -> 67%; with ROUTINE raised to 70 it becomes ROUTINE
    expect(getCompetitivenessBand([set(6, 4), set(6, 4)], { DECISIVE: 20, ROUTINE: 70 })).toBe('ROUTINE');
  });
});

describe('getCompetitivenessFromScoreString', () => {
  it('parses and classifies a score string', () => {
    expect(getCompetitivenessFromScoreString('6-0 6-1')).toBe('DECISIVE');
    expect(getCompetitivenessFromScoreString('6-2 6-3')).toBe('ROUTINE');
    expect(getCompetitivenessFromScoreString('7-6(2) 6-7(4) 7-6(5)')).toBe('COMPETITIVE');
  });

  it('returns undefined for an empty score string', () => {
    expect(getCompetitivenessFromScoreString(undefined)).toBeUndefined();
    expect(getCompetitivenessFromScoreString('')).toBeUndefined();
  });
});

describe('competitivenessForMatchUp', () => {
  it('buckets walkovers/defaults by status', () => {
    expect(competitivenessForMatchUp({ matchUpStatus: 'WALKOVER', winningSide: 1 })).toBe('WALKOVER');
    expect(competitivenessForMatchUp({ matchUpStatus: 'DOUBLE_DEFAULT' })).toBe('WALKOVER');
  });

  it('returns undefined for undecided matchUps', () => {
    expect(competitivenessForMatchUp({ matchUpStatus: 'TO_BE_PLAYED' })).toBeUndefined();
    expect(competitivenessForMatchUp({ winningSide: undefined, scoreString: '6-1 6-2' })).toBeUndefined();
  });

  it('prefers structured sets but falls back to the score string', () => {
    expect(competitivenessForMatchUp({ winningSide: 1, sets: [set(6, 0), set(6, 0)] })).toBe('DECISIVE');
    expect(competitivenessForMatchUp({ winningSide: 1, scoreString: '6-4 6-4' })).toBe('COMPETITIVE');
  });
});

describe('competitivenessColor', () => {
  it('maps each bucket to the default palette', () => {
    expect(competitivenessColor('COMPETITIVE')).toBe(COMPETITIVENESS_COLORS.COMPETITIVE);
    expect(competitivenessColor('DECISIVE')).toBe(COMPETITIVENESS_COLORS.DECISIVE);
  });

  it('falls back to the neutral color when no bucket is given', () => {
    expect(competitivenessColor(undefined)).toBe(NEUTRAL_SEGMENT_COLOR);
  });

  it('applies per-chart overrides', () => {
    expect(competitivenessColor('COMPETITIVE', { COMPETITIVE: '#000000' })).toBe('#000000');
  });
});
