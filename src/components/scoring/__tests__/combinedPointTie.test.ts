/**
 * A combined-point total that allows a tie (`SET1-S:P32`) can end 16–16: COMPLETED with no winner (CA,
 * 2026-10-11: ties are valid, which is the point of Padel/Americano scoring). Every score dialog used to
 * require a winner before Submit, so a director could not enter the result. A tie counts as finished only
 * when the factory says the set is over and the format allows a tie; `P32DP` at 16–16 still owes its
 * deciding point, and 10–10 has not reached the total.
 */
import { isComplete, matchUpStatus, winningSide, error } from '../logic/scoreEntrySelectors';
import { createScoreEntryModel, setCell } from '../logic/scoreEntryModel';
import { isCompletedCombinedPointTie } from '../logic/combinedPointTie';
import { G } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { describe, expect, it } from 'vitest';

const POINTS_32 = 'SET1-S:P32';
const DECIDING_POINT = 'SET1-S:P32DP';

describe('isCompletedCombinedPointTie', () => {
  const set = (side1Score: number, side2Score: number) => [{ setNumber: 1, side1Score, side2Score }];

  it('a finished level total under a format that allows a tie', () => {
    expect(isCompletedCombinedPointTie(set(16, 16), POINTS_32)).toBe(true);
    expect(isCompletedCombinedPointTie(set(12, 12), 'SET1-S:P24')).toBe(true);
  });

  it('not a tie that has not reached the total, a won result, or a format that resolves a tie', () => {
    expect(isCompletedCombinedPointTie(set(10, 10), POINTS_32)).toBe(false);
    expect(isCompletedCombinedPointTie(set(17, 15), POINTS_32)).toBe(false);
    expect(isCompletedCombinedPointTie(set(16, 16), DECIDING_POINT)).toBe(false);
    expect(isCompletedCombinedPointTie(set(16, 16), 'SET1-S:P32WB2')).toBe(false);
    expect(isCompletedCombinedPointTie(set(6, 6), 'SET3-S:6/TB7')).toBe(false);
    expect(isCompletedCombinedPointTie([], POINTS_32)).toBe(false);
  });
});

describe('the score-entry dialog (selectors)', () => {
  function entered(matchUpFormat: string, side1: number, side2: number) {
    let model = createScoreEntryModel({ matchUpFormat });
    model = setCell(model, G(0, 1), side1);
    return setCell(model, G(0, 2), side2);
  }

  it('16-16 is complete, COMPLETED, with no winner and no error', () => {
    const model = entered(POINTS_32, 16, 16);
    expect(error(model)).toBeUndefined();
    expect(isComplete(model)).toBe(true);
    expect(matchUpStatus(model)).toBe('COMPLETED');
    expect(winningSide(model)).toBeUndefined();
  });

  it('control: 17-15 is complete with its winner; 10-10 and a deciding-point 16-16 are not complete', () => {
    expect(isComplete(entered(POINTS_32, 17, 15))).toBe(true);
    expect(winningSide(entered(POINTS_32, 17, 15))).toBe(1);
    expect(isComplete(entered(POINTS_32, 10, 10))).toBe(false);
    expect(isComplete(entered(DECIDING_POINT, 16, 16))).toBe(false);
  });
});
