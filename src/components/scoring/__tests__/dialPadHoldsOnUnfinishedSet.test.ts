/**
 * The Dial Pad does not move on from a set that is not finished (CA, 2026-10-08).
 *
 * Under `SET3-S:6/TB7` the keypad accepted `5-1 1-4 3-3`: Submit rightly refused it, but every tap after
 * the `5-1` was wasted work the operator could not see was wasted. Now a finished set is the condition
 * for starting the next one, and the Tiebreak key is offered only once a set's games can carry one.
 *
 * The rules are `logic/dialPadEntry.ts`, driven here as taps over a frozen model. What the band SAYS for
 * those models is the card's composition of these selectors (`scoreEntrySummary`); that the keys reach
 * these rules, and the band follows, is `DialPadEntryTests.stories.ts`.
 */
import { scoreString, isComplete, error, unrecordedTiebreakNote } from '../logic/scoreEntrySelectors';
import { dialPadDigit, dialPadReadout, tiebreakKeyOffered } from '../logic/dialPadEntry';
import { frozen } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { describe, expect, it } from 'vitest';

import type { ScoreEntryModel } from '../logic/scoreEntryModel';

const FORMAT = 'SET3-S:6/TB7';
const NOT_RECORDED = '1st set: tiebreak points not recorded';

const pad = (matchUpFormat = FORMAT) => frozen({ matchUpFormat, approach: 'dialPad' });
const tap = (model: ScoreEntryModel, ...digits: number[]) =>
  digits.reduce((next, digit) => dialPadDigit(next, { digit }), model);
const tapTiebreak = (model: ScoreEntryModel, ...digits: number[]) =>
  digits.reduce((next, digit) => dialPadDigit(next, { digit, tiebreakMode: true }), model);

describe('the Dial Pad holds on an unfinished set', () => {
  it('after 5-1 the keypad goes quiet: no second set starts', () => {
    const fiveOne = tap(pad(), 1, 5);
    expect(scoreString(fiveOne)).toBe('5-1');

    // the taps that used to begin set two go nowhere: the same model comes back
    expect(tap(fiveOne, 4, 1)).toBe(fiveOne);
    expect(dialPadReadout(fiveOne).map((set) => set.side1Score)).toEqual([5]);
  });

  it('6-7 is a finished set: the next set starts, with or without the tiebreak points', () => {
    // Until 2026-11-07 the keypad stopped here until the Tiebreak key supplied the points. A bare 7-6 is the
    // set the engine records (ruling V11), so the next set opens; the points are offered, not owed (CA).
    const sixSeven = tap(pad(), 7, 6); // lower row 7, upper row 6
    expect(scoreString(sixSeven)).toBe('6-7');

    const second = tap(sixSeven, 4, 6);
    expect(scoreString(second)).toBe('6-7 6-4');

    const third = tap(second, 4, 6);
    expect(scoreString(third)).toBe('6-7 6-4 6-4');
    // once the score is a result, the band's note says what was left out
    expect(unrecordedTiebreakNote(third)).toBe(NOT_RECORDED);
    expect(isComplete(third)).toBe(true);
    expect(error(third)).toBeUndefined();
  });

  it('Tiebreak mode still records the points on a 6-7, before the next set starts', () => {
    const points = tapTiebreak(tap(pad(), 7, 6), 4); // the loser's points: 6-7(4)
    expect(scoreString(points)).toBe('6-7(4)');

    // leaving Tiebreak mode is the operator's toggle; the next games digits start set two
    const second = tap(points, 4, 6);
    expect(scoreString(second)).toBe('6-7(4) 6-4');
    expect(unrecordedTiebreakNote(second)).toBeUndefined();
  });

  it('a finished set still lets the next one start', () => {
    const played = tap(pad(), 4, 6, 3, 6);
    expect(scoreString(played)).toBe('6-4 6-3');
    expect(isComplete(played)).toBe(true);
  });
});

describe('the Tiebreak key is offered only when a set can carry one', () => {
  it('is withheld with no games, after 5-1, after a finished 6-4 and at 6-6; offered at 7-6', () => {
    expect(tiebreakKeyOffered(pad())).toBe(false);
    expect(tiebreakKeyOffered(tap(pad(), 1, 5))).toBe(false);
    expect(tiebreakKeyOffered(tap(pad(), 4, 6))).toBe(false);
    expect(tiebreakKeyOffered(tap(pad(), 6, 7))).toBe(true);
    // at six-all the tiebreak is being PLAYED: there is no result to type yet (the Dynamic Sets rule)
    expect(tiebreakKeyOffered(tap(pad(), 6, 6))).toBe(false);
  });

  it('a match tiebreak set never offers the key: its cells are the points', () => {
    expect(tiebreakKeyOffered(pad('SET1-S:TB10'))).toBe(false);
    expect(tiebreakKeyOffered(tap(pad('SET1-S:TB10'), 8))).toBe(false);
  });
});
