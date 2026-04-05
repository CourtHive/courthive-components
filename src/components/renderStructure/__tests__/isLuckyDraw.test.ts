import { describe, expect, it } from 'vitest';
import { isLuckyDraw } from '../isLuckyDraw';

describe('isLuckyDraw', () => {
  it('returns false for power-of-2 standard elimination (32→16→8→4→2→1)', () => {
    const roundProfile = {
      1: { matchUpsCount: 32 },
      2: { matchUpsCount: 16 },
      3: { matchUpsCount: 8 },
      4: { matchUpsCount: 4 },
      5: { matchUpsCount: 2 },
      6: { matchUpsCount: 1 }
    };
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: false,
        hasNoRoundPositions: false,
        roundNumbers: [1, 2, 3, 4, 5, 6],
        roundProfile: roundProfile as any
      })
    ).toBe(false);
  });

  it('returns false for qualifying structure with consistent halving (24→12→6)', () => {
    const roundProfile = {
      1: { matchUpsCount: 24 },
      2: { matchUpsCount: 12 },
      3: { matchUpsCount: 6 }
    };
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: true,
        hasNoRoundPositions: false,
        roundNumbers: [1, 2, 3],
        roundProfile: roundProfile as any
      })
    ).toBe(false);
  });

  it('returns false for small qualifying (6→3)', () => {
    const roundProfile = {
      1: { matchUpsCount: 6 },
      2: { matchUpsCount: 3 }
    };
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: true,
        hasNoRoundPositions: false,
        roundNumbers: [1, 2],
        roundProfile: roundProfile as any
      })
    ).toBe(false);
  });

  it('returns false for feed-in structure where round count stays equal then halves', () => {
    const roundProfile = {
      1: { matchUpsCount: 8 },
      2: { matchUpsCount: 8 },
      3: { matchUpsCount: 4 },
      4: { matchUpsCount: 2 },
      5: { matchUpsCount: 1 }
    };
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: false,
        hasNoRoundPositions: false,
        roundNumbers: [1, 2, 3, 4, 5],
        roundProfile: roundProfile as any
      })
    ).toBe(false);
  });

  it('returns true when hasNoRoundPositions is set', () => {
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: false,
        hasNoRoundPositions: true,
        roundNumbers: [1, 2],
        roundProfile: { 1: { matchUpsCount: 4 }, 2: { matchUpsCount: 2 } } as any
      })
    ).toBe(true);
  });

  it('returns true for irregular round sizes (not halving)', () => {
    const roundProfile = {
      1: { matchUpsCount: 7 },
      2: { matchUpsCount: 4 },
      3: { matchUpsCount: 2 },
      4: { matchUpsCount: 1 }
    };
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: true,
        hasNoRoundPositions: false,
        roundNumbers: [1, 2, 3, 4],
        roundProfile: roundProfile as any
      })
    ).toBe(true);
  });

  it('returns true when round count increases (5→8→4)', () => {
    const roundProfile = {
      1: { matchUpsCount: 5 },
      2: { matchUpsCount: 8 },
      3: { matchUpsCount: 4 }
    };
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: true,
        hasNoRoundPositions: false,
        roundNumbers: [1, 2, 3],
        roundProfile: roundProfile as any
      })
    ).toBe(true);
  });

  it('returns true for single round with non-power-of-2 count', () => {
    const roundProfile = {
      1: { matchUpsCount: 3 }
    };
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: true,
        hasNoRoundPositions: false,
        roundNumbers: [1],
        roundProfile: roundProfile as any
      })
    ).toBe(true);
  });

  it('returns false when all params are falsy/empty', () => {
    expect(isLuckyDraw({})).toBe(false);
  });

  it('returns false when roundsNotPowerOf2 is false regardless of profile', () => {
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: false,
        hasNoRoundPositions: false,
        roundNumbers: [1, 2, 3],
        roundProfile: {
          1: { matchUpsCount: 7 },
          2: { matchUpsCount: 4 },
          3: { matchUpsCount: 1 }
        } as any
      })
    ).toBe(false);
  });

  it('returns false for 48-player qualifying with 6 qualifiers (real production case)', () => {
    // This is the exact scenario from the production bug:
    // 48 players, 24 BYEs, qualifyingRoundNumber: 3, producing 6 qualifiers
    const roundProfile = {
      1: { matchUpsCount: 24 },
      2: { matchUpsCount: 12 },
      3: { matchUpsCount: 6 }
    };
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: true,
        hasNoRoundPositions: false,
        roundNumbers: [1, 2, 3],
        roundProfile: roundProfile as any
      })
    ).toBe(false);
  });

  it('returns false for non-power-of-2 feed-in qualifying (12→12→6→3)', () => {
    const roundProfile = {
      1: { matchUpsCount: 12 },
      2: { matchUpsCount: 12 },
      3: { matchUpsCount: 6 },
      4: { matchUpsCount: 3 }
    };
    expect(
      isLuckyDraw({
        roundsNotPowerOf2: true,
        hasNoRoundPositions: false,
        roundNumbers: [1, 2, 3, 4],
        roundProfile: roundProfile as any
      })
    ).toBe(false);
  });
});
