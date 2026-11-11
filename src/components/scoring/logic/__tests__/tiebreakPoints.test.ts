/**
 * CA, 2026-11-11: *"It is standard to only show the tiebreak points for the losing side, so 7-6(0) is
 * assumed to be 7-6(7-0) and 7-6(9) is assumed to be 7-6(11-9) with the standard SET3-S:6/TB7."* And
 * *"if we don't have both tiebreak values just show the games score"*.
 *
 * `lowerTiebreakPoints` (entry feedback) and `settledTiebreakPoints` (stored display) share the lower-of-two
 * rule and differ only on a lone value. The parity block holds the scoring dialog (`raisedTiebreakPoints`)
 * and the draw cell (`setScoreView`) to exactly that: equal whenever both values are in.
 */
import { setScoreView } from '../../../renderStructure/sideScoreModel';
import { raisedTiebreakPoints } from '../dynamicSetsEntry';
import { createScoreEntryModel } from '../scoreEntryModel';
import { lowerTiebreakPoints, settledTiebreakPoints } from '../tiebreakPoints';
import { describe, it, expect } from 'vitest';

import type { SetScore } from '../../../../types';

describe('lowerTiebreakPoints', () => {
  it.each([
    [4, 7, 4],
    [7, 4, undefined],
    [0, 7, 0],
    [7, 0, undefined],
    [9, 11, 9],
    [11, 9, undefined]
  ])('mine %s against theirs %s shows %s', (mine, theirs, shown) => {
    expect(lowerTiebreakPoints(mine, theirs)).toBe(shown);
  });

  it('a lone value shows on its own side, whether it is high or low', () => {
    expect(lowerTiebreakPoints(7, undefined)).toBe(7);
    expect(lowerTiebreakPoints(0, undefined)).toBe(0);
    expect(lowerTiebreakPoints(undefined, 7)).toBeUndefined();
    expect(lowerTiebreakPoints(undefined, undefined)).toBeUndefined();
  });

  it('a tie, which no finished tiebreak can be, shows on neither side', () => {
    expect(lowerTiebreakPoints(6, 6)).toBeUndefined();
    expect(lowerTiebreakPoints(0, 0)).toBeUndefined();
  });
});

describe('settledTiebreakPoints', () => {
  it.each([
    [4, 7, 4],
    [7, 4, undefined],
    [0, 7, 0],
    [9, 11, 9],
    [6, 6, undefined]
  ])('with both recorded, mine %s against theirs %s shows %s, as lowerTiebreakPoints does', (mine, theirs, shown) => {
    expect(settledTiebreakPoints(mine, theirs)).toBe(shown);
    expect(settledTiebreakPoints(mine, theirs)).toBe(lowerTiebreakPoints(mine, theirs));
  });

  it('with either value missing, neither side raises anything', () => {
    expect(settledTiebreakPoints(7, undefined)).toBeUndefined();
    expect(settledTiebreakPoints(0, undefined)).toBeUndefined();
    expect(settledTiebreakPoints(undefined, 7)).toBeUndefined();
    expect(settledTiebreakPoints(undefined, undefined)).toBeUndefined();
  });
});

describe('the scoring dialog and the draw cell raise the same points when both are in', () => {
  const pairs: [number | undefined, number | undefined][] = [
    [7, 4],
    [4, 7],
    [7, 0],
    [11, 9],
    [6, 6]
  ];

  it.each(pairs)('side1 %s / side2 %s', (side1TiebreakScore, side2TiebreakScore) => {
    const set: SetScore = {
      setNumber: 1,
      side1Score: 7,
      side2Score: 6,
      winningSide: 1,
      ...(side1TiebreakScore !== undefined && { side1TiebreakScore }),
      ...(side2TiebreakScore !== undefined && { side2TiebreakScore })
    };
    const model = createScoreEntryModel({ matchUpFormat: 'SET3-S:6/TB7', sets: [set] });
    for (const side of [1, 2] as const) {
      const dialog = raisedTiebreakPoints(model, 0, side);
      const cell = setScoreView({ set, sideNumber: side }).tiebreak;
      expect(cell, `side ${side}`).toBe(dialog === undefined ? '' : String(dialog));
    }
  });
});

describe('a lone value: shown while entering, not in the draw', () => {
  it.each([
    [7, undefined],
    [undefined, 3]
  ])('side1 %s / side2 %s', (side1TiebreakScore, side2TiebreakScore) => {
    const set: SetScore = {
      setNumber: 1,
      side1Score: 7,
      side2Score: 6,
      winningSide: 1,
      ...(side1TiebreakScore !== undefined && { side1TiebreakScore }),
      ...(side2TiebreakScore !== undefined && { side2TiebreakScore })
    };
    const model = createScoreEntryModel({ matchUpFormat: 'SET3-S:6/TB7', sets: [set] });
    const typedSide = side1TiebreakScore === undefined ? 2 : 1;
    // the dialog keeps what the operator typed in view
    expect(raisedTiebreakPoints(model, 0, typedSide)).toBe(side1TiebreakScore ?? side2TiebreakScore);
    // the draw cell shows the games alone, on both sides
    for (const side of [1, 2] as const) expect(setScoreView({ set, sideNumber: side }).tiebreak).toBe('');
  });
});
