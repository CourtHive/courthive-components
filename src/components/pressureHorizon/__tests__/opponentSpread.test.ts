import { describe, it, expect } from 'vitest';

import { opponentSpread, weightedQuantile } from '../opponentSpread';

// constants and types
import type { PossibleOpponent } from '../../pressureChart/types';

function opponent(elo: number | null, probability: number, id = `p${elo}`): PossibleOpponent {
  return { participantId: id, probability, elo };
}

describe('weightedQuantile', () => {
  it('returns the only value when there is one', () => {
    const single = [{ value: 1500, weight: 1 }];
    expect(weightedQuantile(single, 0.25)).toBe(1500);
    expect(weightedQuantile(single, 0.75)).toBe(1500);
  });

  it('follows the weights, not the count', () => {
    // 90% of the mass sits on 1000; the quartiles must both land there even though
    // half the DISTINCT values are 2000.
    const skewed = [
      { value: 1000, weight: 0.9 },
      { value: 2000, weight: 0.1 }
    ];
    expect(weightedQuantile(skewed, 0.25)).toBe(1000);
    expect(weightedQuantile(skewed, 0.75)).toBe(1000);
    expect(weightedQuantile(skewed, 0.95)).toBe(2000);
  });

  it('splits an even distribution across the quartiles', () => {
    const even = [1000, 1200, 1400, 1600].map((value) => ({ value, weight: 0.25 }));
    expect(weightedQuantile(even, 0.25)).toBe(1000);
    expect(weightedQuantile(even, 0.75)).toBe(1400);
  });

  it('returns null on an empty pool rather than a fabricated value', () => {
    expect(weightedQuantile([], 0.5)).toBeNull();
  });

  it('falls back to the first value when every weight is zero', () => {
    expect(weightedQuantile([{ value: 1500, weight: 0 }], 0.5)).toBe(1500);
  });
});

describe('opponentSpread', () => {
  it('collapses to a point when only one opponent is possible', () => {
    // Round 1: the opponent is known, so there is no spread to draw.
    const spread = opponentSpread([opponent(1500, 1)]);
    expect(spread).toEqual({ outerLow: 1500, outerHigh: 1500, innerLow: 1500, innerHigh: 1500 });
  });

  /**
   * The measurement that justified two envelopes: `opponentEloRange` is a min/max over
   * everyone clearing a 1% arrival threshold, so a single long shot stretches it. The
   * inner envelope has to ignore that; the outer has to keep it.
   */
  it('keeps a long shot in the outer envelope and out of the inner one', () => {
    const spread = opponentSpread([
      opponent(1500, 0.48),
      opponent(1560, 0.48),
      opponent(2400, 0.04) // a 4% chance of a far stronger opponent
    ]);
    expect(spread?.outerHigh).toBe(2400);
    expect(spread?.innerHigh).toBeLessThan(2400);
    expect(spread?.innerLow).toBe(1500);
  });

  it('always nests the inner envelope inside the outer one', () => {
    const pools: PossibleOpponent[][] = [
      [opponent(1000, 0.5), opponent(2000, 0.5)],
      [opponent(1000, 0.98), opponent(1900, 0.02)],
      [opponent(1200, 0.3), opponent(1300, 0.3), opponent(1400, 0.3), opponent(2500, 0.1)]
    ];
    for (const pool of pools) {
      const spread = opponentSpread(pool);
      expect(spread).not.toBeNull();
      expect(spread?.innerLow).toBeGreaterThanOrEqual(spread?.outerLow as number);
      expect(spread?.innerHigh).toBeLessThanOrEqual(spread?.outerHigh as number);
      expect(spread?.innerLow).toBeLessThanOrEqual(spread?.innerHigh as number);
    }
  });

  it('ignores unrated opponents rather than treating them as zero', () => {
    const spread = opponentSpread([opponent(1500, 0.5, 'a'), opponent(null, 0.5, 'b')]);
    expect(spread).toEqual({ outerLow: 1500, outerHigh: 1500, innerLow: 1500, innerHigh: 1500 });
  });

  it('returns null when nobody in the pool carries a rating', () => {
    expect(opponentSpread([opponent(null, 0.5, 'a'), opponent(null, 0.5, 'b')])).toBeNull();
    expect(opponentSpread([])).toBeNull();
  });

  it('does not depend on the order the pool arrives in', () => {
    const pool = [opponent(2000, 0.2), opponent(1000, 0.5), opponent(1500, 0.3)];
    expect(opponentSpread(pool)).toEqual(opponentSpread([...pool].reverse()));
  });
});
