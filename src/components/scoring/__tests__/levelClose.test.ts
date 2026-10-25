/**
 * A match that ends level with no declared decider is COMPLETED with no winner (tods-competition-factory
 * 7.16.0, #5612 in CourtHive/competition-factory, spec § 9.2 and § 9.3): an exactly count of halves at one
 * each, an aggregate level on games. The inline scorer already reports these; the score dialogs judged
 * completion by a winner only, so a director could not submit the result. They now ask the factory.
 */
import { isComplete, matchUpStatus, winningSide, error } from '../logic/scoreEntrySelectors';
import { createScoreEntryModel, setCell } from '../logic/scoreEntryModel';
import { isCompletedLevelClose } from '../logic/combinedPointTie';
import { G } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { describe, expect, it } from 'vitest';

const AGGREGATE_TIMED = 'SET2XA-S:T10';
const EXACTLY_TWO_HALVES = 'HAL2X-S:TB11';

const sets = (...totals: [number, number][]) =>
  totals.map(([side1Score, side2Score], index) => ({ setNumber: index + 1, side1Score, side2Score }));

describe('isCompletedLevelClose', () => {
  it('a count or an aggregate that the factory closes level, and the combined-point tie', () => {
    expect(isCompletedLevelClose(sets([11, 5], [5, 11]), EXACTLY_TWO_HALVES)).toBe(true);
    expect(isCompletedLevelClose(sets([3, 3], [4, 4]), AGGREGATE_TIMED)).toBe(true);
    expect(isCompletedLevelClose(sets([5, 3], [2, 4]), AGGREGATE_TIMED)).toBe(true);
    expect(isCompletedLevelClose(sets([16, 16]), 'SET1-S:P32')).toBe(true);
  });

  it('control: a result with a winner, a match still in play, a declared decider, nothing to judge', () => {
    expect(isCompletedLevelClose(sets([11, 5], [11, 7]), EXACTLY_TWO_HALVES)).toBe(false);
    expect(isCompletedLevelClose(sets([11, 5]), EXACTLY_TWO_HALVES)).toBe(false);
    expect(isCompletedLevelClose(sets([5, 3], [2, 3]), AGGREGATE_TIMED)).toBe(false);
    expect(isCompletedLevelClose(sets([6, 4], [4, 6]), 'SET3-S:6/TB7')).toBe(false);
    expect(isCompletedLevelClose(sets([3, 3], [4, 4]), 'SET2XA-S:T10-F:TB1')).toBe(false);
    expect(isCompletedLevelClose(sets([16, 16]), 'SET1-S:P32DP')).toBe(false);
    expect(isCompletedLevelClose([], AGGREGATE_TIMED)).toBe(false);
    expect(isCompletedLevelClose(sets([3, 3]), undefined)).toBe(false);
    expect(isCompletedLevelClose(sets([3, 3]), 'not-a-format')).toBe(false);
  });

  it('a tiebreak-only set entered by its tiebreak scores alone', () => {
    const halves = [
      { setNumber: 1, side1TiebreakScore: 11, side2TiebreakScore: 5 },
      { setNumber: 2, side1TiebreakScore: 5, side2TiebreakScore: 11 }
    ];
    expect(isCompletedLevelClose(halves, EXACTLY_TWO_HALVES)).toBe(true);
    expect(isCompletedLevelClose([halves[0], { ...halves[0], setNumber: 2 }], EXACTLY_TWO_HALVES)).toBe(false);
    expect(isCompletedLevelClose([{ setNumber: 1, side1TiebreakScore: 11 }], EXACTLY_TWO_HALVES)).toBe(false);
  });

  it('a set past the close is not a completed tie', () => {
    expect(isCompletedLevelClose(sets([11, 5], [5, 11], [11, 3]), EXACTLY_TWO_HALVES)).toBe(false);
  });

  it('a total the factory refuses is not a completed tie, and does not throw', () => {
    expect(() => isCompletedLevelClose(sets([3.5, 3.5], [4, 4]), AGGREGATE_TIMED)).not.toThrow();
    expect(isCompletedLevelClose(sets([3.5, 3.5], [4, 4]), AGGREGATE_TIMED)).toBe(false);
  });
});

describe('the score-entry dialog (selectors)', () => {
  function entered(matchUpFormat: string, totals: [number, number][]) {
    let model = createScoreEntryModel({ matchUpFormat });
    totals.forEach(([side1, side2], index) => {
      model = setCell(model, G(index, 1), side1);
      model = setCell(model, G(index, 2), side2);
    });
    return model;
  }

  it('an aggregate level on games is complete, COMPLETED, with no winner and no error', () => {
    const model = entered(AGGREGATE_TIMED, [
      [3, 3],
      [4, 4]
    ]);
    expect(error(model)).toBeUndefined();
    expect(isComplete(model)).toBe(true);
    expect(winningSide(model)).toBeUndefined();
    expect(matchUpStatus(model)).toBe('COMPLETED');
  });

  it('control: one set entered of the two is not complete', () => {
    const model = entered(AGGREGATE_TIMED, [[3, 3]]);
    expect(isComplete(model)).toBe(false);
  });
});
