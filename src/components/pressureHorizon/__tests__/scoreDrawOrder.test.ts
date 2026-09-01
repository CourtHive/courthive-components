import { describe, it, expect } from 'vitest';

import { scoreDrawOrder, blockLevels, maxDisplacementFor } from '../scoreDrawOrder';

const EIGHT = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

describe('blockLevels', () => {
  it('walks the bracket levels below the full field', () => {
    expect(blockLevels(8)).toEqual([2, 4]);
    expect(blockLevels(16)).toEqual([2, 4, 8]);
  });

  it('stops where the field stops dividing', () => {
    expect(blockLevels(6)).toEqual([2]);
    expect(blockLevels(5)).toEqual([]);
    expect(blockLevels(2)).toEqual([]);
  });
});

describe('maxDisplacementFor', () => {
  it('is the displacement a full reversal achieves', () => {
    for (const size of [2, 3, 4, 5, 8, 9]) {
      const order = Array.from({ length: size }, (_, index) => index);
      const reversed = [...order].reverse();
      const displacement = reversed.reduce((total, value, index) => total + Math.abs(index - value), 0);
      expect(maxDisplacementFor(size)).toBe(displacement);
    }
  });
});

describe('scoreDrawOrder', () => {
  it('scores a correct board as perfect on every measure', () => {
    const score = scoreDrawOrder({ guess: [...EIGHT], actual: EIGHT });
    expect(score.structureScore).toBe(100);
    expect(score.structurePerfect).toBe(true);
    expect(score.perfect).toBe(true);
    expect(score.exact).toBe(8);
    expect(score.displacement).toBe(0);
    expect(score.proximity).toBe(1);
  });

  /**
   * The reason the headline is structural. This guess swaps the two halves of the
   * draw wholesale — a bracket that is identical in every pairing and reads as
   * completely wrong if you count slots. The player solved it; the score has to
   * say so.
   */
  it('is invariant under a half swap — the same bracket, upside down', () => {
    const mirrored = [...EIGHT.slice(4), ...EIGHT.slice(0, 4)];
    const score = scoreDrawOrder({ guess: mirrored, actual: EIGHT });
    expect(score.structureScore).toBe(100);
    expect(score.structurePerfect).toBe(true);
    // ...while the positional measures collapse, which is exactly the gap the
    // score panel explains to the player.
    expect(score.exact).toBe(0);
    expect(score.perfect).toBe(false);
  });

  it('is invariant under swapping the two players inside a first-round pair', () => {
    const swappedPair = ['b', 'a', ...EIGHT.slice(2)];
    const score = scoreDrawOrder({ guess: swappedPair, actual: EIGHT });
    expect(score.structureScore).toBe(100);
    expect(score.exact).toBe(6);
  });

  it('is invariant under swapping two quarters inside a half', () => {
    const swappedQuarters = ['c', 'd', 'a', 'b', ...EIGHT.slice(4)];
    const score = scoreDrawOrder({ guess: swappedQuarters, actual: EIGHT });
    expect(score.structureScore).toBe(100);
    expect(score.structurePerfect).toBe(true);
  });

  /**
   * The falsification of the above: the measure has to be able to report a low
   * score, or "100 for every symmetry" would just mean it always returns 100.
   */
  it('drops when the pairings themselves are wrong', () => {
    // Rotating by one breaks every pair and every quarter.
    const rotated = [...EIGHT.slice(1), EIGHT[0]];
    const score = scoreDrawOrder({ guess: rotated, actual: EIGHT });
    expect(score.structureScore).toBe(0);
    expect(score.blocksMatched).toBe(0);
    expect(score.structurePerfect).toBe(false);
  });

  it('gives partial credit for the pairs that were recovered', () => {
    // 'a|b' and 'g|h' survive; the middle four are re-paired wrongly.
    const partial = ['a', 'b', 'c', 'e', 'd', 'f', 'g', 'h'];
    const score = scoreDrawOrder({ guess: partial, actual: EIGHT });
    const pairs = score.levels.find((level) => level.blockSize === 2);
    expect(pairs).toEqual({ blockSize: 2, matched: 2, total: 4 });
    expect(score.structureScore).toBeGreaterThan(0);
    expect(score.structureScore).toBeLessThan(100);
  });

  it('reports proximity from displacement, with a reversal at zero', () => {
    const reversed = [...EIGHT].reverse();
    const score = scoreDrawOrder({ guess: reversed, actual: EIGHT });
    expect(score.displacement).toBe(score.maxDisplacement);
    expect(score.proximity).toBe(0);
  });

  it('falls back to proximity when the field has no divisible levels', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    const score = scoreDrawOrder({ guess: [...five], actual: five });
    expect(score.blocksTotal).toBe(0);
    expect(score.structureScore).toBe(100);
  });

  it('marks each slot with where the row really belongs', () => {
    const score = scoreDrawOrder({ guess: ['b', 'a', 'c', 'd', 'e', 'f', 'g', 'h'], actual: EIGHT });
    expect(score.slotResults[0]).toEqual({ slotIndex: 0, participantId: 'b', actualIndex: 1, correct: false });
    expect(score.slotResults[2]).toEqual({ slotIndex: 2, participantId: 'c', actualIndex: 2, correct: true });
  });

  it('throws rather than scoring a board that is not a permutation', () => {
    expect(() => scoreDrawOrder({ guess: ['a', 'a'], actual: ['a', 'b'] })).toThrow(/permutation/);
    expect(() => scoreDrawOrder({ guess: ['a'], actual: ['a', 'b'] })).toThrow(/permutation/);
    expect(() => scoreDrawOrder({ guess: ['a', 'z'], actual: ['a', 'b'] })).toThrow(/absent from actual/);
  });
});
