/**
 * The selectors: one answer each, computed from a model and nothing else.
 *
 * The cases here are the ones that used to be three regions' separate opinions — `scoreString`,
 * `isComplete`, `winningSide`, `matchUpStatus`, `error` — plus the layout rule that ends note 9's ghost
 * set and the 10A property that ends `4-2 2-6 2-6`. Expected values are quoted from the factory where
 * the factory is the source: the score line, the validation messages, the set winners.
 */
import { deepFreeze, frozen, enter, typed, G, TB } from './scoreEntryModelTestHelpers';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { chooseEnding, setCell } from '../scoreEntryModel';
import { describe, it, expect } from 'vitest';
import {
  discardedScore,
  completedSets,
  matchUpStatus,
  enteredSets,
  scoreString,
  winningSide,
  isComplete,
  cellValue,
  hasEntry,
  columns,
  error
} from '../scoreEntrySelectors';

const { COMPLETED, RETIRED, WALKOVER, SUSPENDED, DOUBLE_WALKOVER } = matchUpStatusConstants;

const STANDARD = 'SET3-S:6/TB7';
const MATCH_TIEBREAK = 'SET1-S:TB10';
const TIMED = 'SET3X-S:T10';

/** A 7-6 with its points in. */
const sevenSixWithPoints = () => setCell(setCell(typed(STANDARD, [7, 6]), TB(0, 1), 7), TB(0, 2), 3);
/** A walkover chosen against side 1. */
const walkover = (model = typed(STANDARD, [6, 4])) =>
  deepFreeze(chooseEnding(model, { kind: 'side', sideNumber: 1, status: WALKOVER }));

describe('which sets count', () => {
  it('enteredSets reports only sets with BOTH sides in — a lone 6 is not a 6-0', () => {
    expect(enteredSets(enter(frozen(), 0, 6))).toEqual([]);
    expect(enteredSets(typed(STANDARD, [6, 4], [3, 2]))).toMatchObject([
      { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
      { setNumber: 2, side1Score: 3, side2Score: 2 }
    ]);
  });

  it('completedSets narrows to sets the factory accepts as finished', () => {
    expect(completedSets(typed(STANDARD, [6, 4], [3, 2]))).toMatchObject([{ setNumber: 1, winningSide: 1 }]);
    // `analyzeSet` calls a 3-1 match tiebreak won; strict validation does not, and neither does this.
    expect(completedSets(typed(MATCH_TIEBREAK, [3, 1]))).toEqual([]);
    expect(completedSets(typed(MATCH_TIEBREAK, [10, 0]))).toHaveLength(1);
  });

  it('hasEntry is true from the first digit', () => {
    expect(hasEntry(frozen())).toBe(false);
    expect(hasEntry(enter(frozen(), 0, undefined, 4))).toBe(true);
  });

  it('cellValue reads one cell', () => {
    const model = sevenSixWithPoints();
    expect(cellValue(model, 0, 2, 'games')).toBe(6);
    expect(cellValue(model, 0, 2, 'tiebreak')).toBe(3);
    expect(cellValue(model, 1, 1, 'games')).toBeUndefined();
    expect(cellValue(model, 7, 1, 'games')).toBeUndefined();
  });
});

describe('scoreString', () => {
  it("is the factory's line over the entered sets", () => {
    expect(scoreString(typed(STANDARD, [6, 4], [3, 2]))).toBe('6-4 3-2');
    expect(scoreString(sevenSixWithPoints())).toBe('7-6(3)');
    expect(scoreString(typed(MATCH_TIEBREAK, [10, 8]))).toBe('[10-8]');
  });

  it('is nothing while nothing is entered', () => {
    expect(scoreString(frozen())).toBeUndefined();
    expect(scoreString(enter(frozen(), 0, 6))).toBeUndefined();
  });

  it('is set aside by a score-clearing ending, named by discardedScore, and comes back when the ending goes', () => {
    const cleared = walkover();
    expect(scoreString(cleared)).toBeUndefined();
    expect(discardedScore(cleared)).toBe('6-4');

    const restored = chooseEnding(cleared, { kind: 'side', sideNumber: 1, status: WALKOVER });
    expect(scoreString(restored)).toBe('6-4');
    expect(discardedScore(restored)).toBeUndefined();
  });

  it('is kept by an ending that keeps the score', () => {
    const retired = chooseEnding(typed(STANDARD, [6, 4], [3, 2]), { kind: 'side', sideNumber: 2, status: RETIRED });
    expect(scoreString(retired)).toBe('6-4 3-2');
    expect(discardedScore(retired)).toBeUndefined();
  });
});

describe('isComplete', () => {
  it('is true for a finished score and false short of one', () => {
    expect(isComplete(typed(STANDARD, [6, 4], [6, 3]))).toBe(true);
    expect(isComplete(typed(STANDARD, [6, 4], [3, 6], [7, 5]))).toBe(true);
    expect(isComplete(typed(STANDARD, [6, 4]))).toBe(false);
    expect(isComplete(typed(STANDARD, [6, 4], [3, 2]))).toBe(false);
    expect(isComplete(frozen())).toBe(false);
  });

  it('note 10A: an unfinished set inside a decided match is NOT a finished score', () => {
    // `analyzeMatchUp` counts side 2's two sets and names a winner. Nothing asked whether set 1 finished.
    expect(isComplete(typed(STANDARD, [4, 2], [2, 6], [2, 6]))).toBe(false);
  });

  it('a 7-6 whose points are unknown does not finish anything', () => {
    expect(isComplete(typed(STANDARD, [7, 6], [6, 3]))).toBe(false);
    expect(isComplete(enter(sevenSixWithPoints(), 1, 6, 3))).toBe(true);
  });

  it('a match tiebreak is finished when strict validation says so, not when a side merely leads', () => {
    expect(isComplete(typed(MATCH_TIEBREAK, [10, 8]))).toBe(true);
    expect(isComplete(typed(MATCH_TIEBREAK, [10, 0]))).toBe(true);
    expect(isComplete(typed(MATCH_TIEBREAK, [10, 9]))).toBe(false);
    expect(isComplete(typed(MATCH_TIEBREAK, [3, 1]))).toBe(false);
  });

  it('a timed match is decided by the factory over every bolt', () => {
    expect(isComplete(typed(TIMED, [22, 21], [21, 22], [22, 21]))).toBe(true);
    // Level after three: no winner, so not a finished result.
    expect(isComplete(typed(TIMED, [22, 21], [21, 22], [21, 21]))).toBe(false);
  });

  it('is false under a score-clearing ending, because there is no result to be finished', () => {
    expect(isComplete(walkover(typed(STANDARD, [6, 4], [6, 3])))).toBe(false);
  });
});

describe('winningSide', () => {
  it("is the finished score's winner", () => {
    expect(winningSide(typed(STANDARD, [6, 4], [6, 3]))).toBe(1);
    expect(winningSide(typed(STANDARD, [4, 6], [3, 6]))).toBe(2);
    expect(winningSide(typed(STANDARD, [6, 4]))).toBeUndefined();
    expect(winningSide(typed(STANDARD, [4, 2], [2, 6], [2, 6]))).toBeUndefined();
  });

  it("is the ending's winner when the ending names one — the OTHER side from the one it happened to", () => {
    expect(
      winningSide(chooseEnding(typed(STANDARD, [6, 4], [3, 2]), { kind: 'side', sideNumber: 1, status: RETIRED }))
    ).toBe(2);
    expect(winningSide(walkover())).toBe(2);
  });

  it('is nobody for a double exit', () => {
    const both = chooseEnding(walkover(), { kind: 'bothSidesOut' });
    expect(matchUpStatus(both)).toBe(DOUBLE_WALKOVER);
    expect(winningSide(both)).toBeUndefined();
  });

  it('falls through to the score under a match-level ending that names no side', () => {
    expect(winningSide(chooseEnding(typed(STANDARD, [6, 4], [6, 3]), { kind: 'match', status: SUSPENDED }))).toBe(1);
    expect(winningSide(chooseEnding(typed(STANDARD, [6, 4]), { kind: 'match', status: SUSPENDED }))).toBeUndefined();
  });
});

describe('matchUpStatus', () => {
  it('is COMPLETED for a finished score and nothing short of one', () => {
    expect(matchUpStatus(typed(STANDARD, [6, 4], [6, 3]))).toBe(COMPLETED);
    expect(matchUpStatus(typed(STANDARD, [6, 4]))).toBeUndefined();
    expect(matchUpStatus(typed(STANDARD, [4, 2], [2, 6], [2, 6]))).toBeUndefined();
  });

  it("is the ending's status when one is chosen", () => {
    expect(matchUpStatus(chooseEnding(typed(STANDARD, [6, 4]), { kind: 'side', sideNumber: 1, status: RETIRED }))).toBe(
      RETIRED
    );
    expect(matchUpStatus(walkover())).toBe(WALKOVER);
    expect(matchUpStatus(chooseEnding(frozen(), { kind: 'match', status: SUSPENDED }))).toBe(SUSPENDED);
  });
});

describe('error', () => {
  it("quotes the factory's judgement of a set that cannot be, with the set named", () => {
    expect(error(typed(STANDARD, [3, 7]))).toBe(
      '1st set: With tiebreak format, if side 2 has 7 games, side 1 must be at least 5, got 3'
    );
    expect(error(typed(STANDARD, [6, 4], [44, 3]))).toContain('2nd set: Set score 44-3 exceeds');
  });

  it('refuses a tiebreak whose points contradict the games', () => {
    const reversed = setCell(setCell(typed(STANDARD, [7, 6]), TB(0, 1), 3), TB(0, 2), 7);
    expect(error(reversed)).toContain('1st set: Set winner must win the tiebreak');
  });

  it('is silent while a set is in progress, and while its tiebreak points are being asked for', () => {
    expect(error(typed(STANDARD, [6, 4], [3, 2]))).toBeUndefined();
    expect(error(typed(STANDARD, [7, 6]))).toBeUndefined();
    expect(error(setCell(typed(STANDARD, [7, 6]), TB(0, 2), 3))).toBeUndefined();
    expect(error(enter(frozen(), 0, 6))).toBeUndefined();
    expect(error(frozen())).toBeUndefined();
  });

  it('note 10A: a set before the last must be finished', () => {
    expect(error(typed(STANDARD, [4, 2], [2, 6], [2, 6]))).toBe('1st set: is not finished');
    expect(error(typed(STANDARD, [6, 4], [3, 2], [6, 1]))).toBe('2nd set: is not finished');
    // Unfinished on POINTS, not games: a 7-6 whose tiebreak is still owed, with a set after it.
    expect(error(typed(STANDARD, [7, 6], [6, 3]))).toBe('1st set: is not finished');
  });

  it('note 9: a cleared set beside a typed one is an empty set, not a vanished one', () => {
    const hole = enter(enter(typed(STANDARD, [6, 2], [6, 2]), 0, undefined, undefined), 0);
    const cleared = setCell(setCell(hole, G(0, 1), undefined), G(0, 2), undefined);
    expect(cleared.sets).toEqual([{}, { side1: 6, side2: 2 }, {}]);
    expect(error(cleared)).toBe('1st set: has no score');
    expect(isComplete(cleared)).toBe(false);
  });

  it('is silent under a score-clearing ending, because nothing typed will be submitted', () => {
    expect(error(walkover(typed(STANDARD, [3, 7])))).toBeUndefined();
  });
});

describe('columns', () => {
  const games = (setIndex: number) => ({ kind: 'games', setIndex });
  const tiebreak = (setIndex: number) => ({ kind: 'tiebreak', setIndex });

  it('opens the first set on an empty model, and the next set after a finished one', () => {
    expect(columns(frozen())).toEqual([games(0)]);
    expect(columns(typed(STANDARD, [6, 4]))).toEqual([games(0), games(1)]);
    expect(columns(typed(STANDARD, [6, 4], [3, 6]))).toEqual([games(0), games(1), games(2)]);
  });

  it('opens nothing after a set that is not finished, or once the match is decided', () => {
    expect(columns(typed(STANDARD, [4, 2]))).toEqual([games(0)]);
    expect(columns(enter(frozen(), 0, 6))).toEqual([games(0)]);
    expect(columns(typed(STANDARD, [6, 4], [6, 3]))).toEqual([games(0), games(1)]);
    expect(columns(typed('SET5-S:6/TB7', [6, 4], [6, 3]))).toEqual([games(0), games(1), games(2)]);
  });

  it('shows a tiebreak column beside a set whose points are owed, and folds it once they are in', () => {
    expect(columns(typed(STANDARD, [7, 6]))).toEqual([games(0), tiebreak(0)]);
    expect(columns(setCell(typed(STANDARD, [7, 6]), TB(0, 2), 3))).toEqual([games(0), tiebreak(0)]);
    expect(columns(sevenSixWithPoints())).toEqual([games(0), games(1)]);
    // 7-5 never calls for one.
    expect(columns(typed(STANDARD, [7, 5]))).toEqual([games(0), games(1)]);
  });

  it('reopens a folded tiebreak column for the set the operator clicked back into', () => {
    expect(columns(sevenSixWithPoints(), { editingSet: 0 })).toEqual([games(0), tiebreak(0), games(1)]);
    expect(columns(sevenSixWithPoints(), { editingSet: 1 })).toEqual([games(0), games(1)]);
  });

  it('note 9: every set that holds anything is shown, whatever came before it', () => {
    const cleared = setCell(setCell(typed(STANDARD, [6, 2], [6, 2]), G(0, 1), undefined), G(0, 2), undefined);
    // Set 1 is EMPTY and set 2 is FULL, and both are on screen. Nothing opens after them.
    expect(columns(cleared)).toEqual([games(0), games(1)]);
  });

  it('a timed format offers the next bolt after any pair of scores, a tie included', () => {
    expect(columns(typed(TIMED, [21, 21]))).toEqual([games(0), games(1)]);
    expect(columns(typed(TIMED, [22, 21], [21, 22]))).toEqual([games(0), games(1), games(2)]);
    expect(columns(typed(TIMED, [22, 21], [21, 22], [22, 21]))).toEqual([games(0), games(1), games(2)]);
  });

  it('a match tiebreak has one column and no tiebreak column', () => {
    expect(columns(typed(MATCH_TIEBREAK, [10, 8]))).toEqual([games(0)]);
    expect(columns(enter(frozen({ matchUpFormat: MATCH_TIEBREAK }), 0, 8))).toEqual([games(0)]);
  });
});
