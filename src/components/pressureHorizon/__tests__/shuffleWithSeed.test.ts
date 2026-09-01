import { describe, it, expect } from 'vitest';

import { shuffleWithSeed, shuffleDeranged, fixedPoints, createRandom } from '../shuffleWithSeed';

const SIXTEEN = Array.from({ length: 16 }, (_, index) => `p${index + 1}`);

describe('createRandom', () => {
  it('produces the same stream for the same seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('stays inside [0, 1)', () => {
    const next = createRandom(7);
    for (let index = 0; index < 500; index++) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('shuffleWithSeed', () => {
  it('is deterministic — the same seed always deals the same board', () => {
    expect(shuffleWithSeed(SIXTEEN, 99)).toEqual(shuffleWithSeed(SIXTEEN, 99));
  });

  it('deals different boards for different seeds', () => {
    expect(shuffleWithSeed(SIXTEEN, 1)).not.toEqual(shuffleWithSeed(SIXTEEN, 2));
  });

  it('keeps the field intact and does not mutate the input', () => {
    const input = [...SIXTEEN];
    const shuffled = shuffleWithSeed(input, 5);
    expect(input).toEqual(SIXTEEN);
    expect([...shuffled].toSorted((a, b) => a.localeCompare(b, 'en'))).toEqual(
      [...SIXTEEN].toSorted((a, b) => a.localeCompare(b, 'en'))
    );
  });
});

describe('shuffleDeranged', () => {
  it('deals a board with nothing left in its true slot', () => {
    const dealt = shuffleDeranged(SIXTEEN, 1);
    expect(dealt.deranged).toBe(true);
    expect(fixedPoints(SIXTEEN, dealt.items)).toBe(0);
  });

  it('reports the seed that produced the board it returns, so the puzzle reproduces', () => {
    const dealt = shuffleDeranged(SIXTEEN, 1);
    expect(shuffleWithSeed(SIXTEEN, dealt.seed)).toEqual(dealt.items);
  });

  /**
   * Falsification: the derangement claim is only meaningful if a plain shuffle
   * from the same starting seed can be shown to leave rows in place. If it never
   * did, `deranged: true` would be reporting nothing.
   */
  it('is doing real work — a plain shuffle does leave rows in place', () => {
    const withFixedPoints = Array.from({ length: 40 }, (_, offset) =>
      fixedPoints(SIXTEEN, shuffleWithSeed(SIXTEEN, offset))
    );
    expect(withFixedPoints.some((count) => count > 0)).toBe(true);
  });

  it('cannot derange a field of one, and says so rather than pretending', () => {
    const dealt = shuffleDeranged(['only'], 1);
    expect(dealt.items).toEqual(['only']);
    expect(dealt.deranged).toBe(false);
  });

  it('still returns a real board when asked for no attempts', () => {
    const dealt = shuffleDeranged(SIXTEEN, 3, 0);
    expect(dealt.deranged).toBe(false);
    expect([...dealt.items].toSorted((a, b) => a.localeCompare(b, 'en'))).toEqual(
      [...SIXTEEN].toSorted((a, b) => a.localeCompare(b, 'en'))
    );
  });
});
