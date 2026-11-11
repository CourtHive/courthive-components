/**
 * The Free Score and Dial Pad rules, in node.
 *
 * The Dial Pad's rules are `logic/dialPadEntry.ts`: where a tap lands, Tiebreak mode, the Backspace order
 * and the match tiebreak, asserted on the model a sequence of taps produces. Free Score's are its parse
 * (`parseScore` committed through `replaceSets`) and its field note (`logic/freeScoreEntry.ts`), read off a
 * real `createFreeScoreRegion`, which builds no DOM until its block is drawn.
 *
 * What the card SAYS for these models, that the keys and the field reach these rules, the readout markup,
 * and every ending clicked on the card are `FreeScoreAndDialPadTests.stories.ts` and
 * `DialPadEntryTests.stories.ts`, in Chromium.
 */
import { dialPadBackspace, dialPadDigit, dialPadReadout, tiebreakKeyOffered } from '../logic/dialPadEntry';
import { scoreString, isComplete, winningSide, enteredSets, error } from '../logic/scoreEntrySelectors';
import { deepFreeze, frozen } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { createScoreEntryModel, replaceSets } from '../logic/scoreEntryModel';
import { resolveReportedEnding } from '../logic/scoreEntryState';
import { createFreeScoreRegion } from '../regions/freeScoreRegion';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { parseScore } from '../../../tools/freeScore/freeScore';
import { freeScoreNote } from '../logic/freeScoreEntry';
import { describe, expect, it } from 'vitest';

import type { ScoreEntryModel } from '../logic/scoreEntryModel';
import type { SetScore } from '../types';

const { WALKOVER, RETIRED } = matchUpStatusConstants;

const FORMAT = 'SET3-S:6/TB7';
/** A set taken on a tiebreak, with the LOSER's points in parentheses — the score-line convention. */
const SEVEN_SIX_THREE = '7-6(3)';
const MATCH_TIEBREAK_FORMAT = 'SET1-S:TB10';
const RET_TEXT = '6-4 2-1 ret';

// ── Dial Pad ───────────────────────────────────────────────────────────

const pad = (matchUpFormat = FORMAT) => frozen({ matchUpFormat, approach: 'dialPad' });
const seeded = (sets: SetScore[], matchUpFormat = FORMAT) =>
  deepFreeze(createScoreEntryModel({ matchUpFormat, approach: 'dialPad', sets }));
const tap = (model: ScoreEntryModel, ...digits: number[]) =>
  digits.reduce((next, digit) => dialPadDigit(next, { digit }), model);
const shiftTap = (model: ScoreEntryModel, ...digits: number[]) =>
  digits.reduce((next, digit) => dialPadDigit(next, { digit, shifted: true }), model);
const tapTiebreak = (model: ScoreEntryModel, ...digits: number[]) =>
  digits.reduce((next, digit) => dialPadDigit(next, { digit, tiebreakMode: true }), model);
const back = (model: ScoreEntryModel, times = 1) =>
  Array.from({ length: times }).reduce<ScoreEntryModel>((next) => dialPadBackspace(next), model);

/** What a side's readout shows: one games value per set holding anything, a missing side read as 0. */
const readout = (model: ScoreEntryModel, side: 1 | 2) =>
  dialPadReadout(model).map((set) => (side === 1 ? set.side1Score : set.side2Score));

describe('Dial Pad', () => {
  it('fills the sets alternately as digits are tapped, LOWER row first', () => {
    // The order reversed on 2026-09-28 (CA): entry begins on the lower participant's row, so `4` then
    // `6` is the 6-4 that `6` then `4` used to be. Asserted per side rather than only through the score,
    // because the score would read the same if both rows had been filled the wrong way round.
    const four = tap(pad(), 4);
    expect(readout(four, 2)).toEqual([4]);
    expect(readout(four, 1), 'the opposite side reads a genuine 0, not blank').toEqual([0]);

    const sixFour = tap(four, 6);
    expect(readout(sixFour, 1)).toEqual([6]);
    expect(scoreString(sixFour)).toBe('6-4');
  });

  it('shows a half-entered set in the readout, but reports only whole sets', () => {
    // A lone `4` is a set the operator is in the middle of; a `0-4` nobody typed is not a score.
    const four = tap(pad(), 4);
    expect(dialPadReadout(four)).toHaveLength(1);
    expect(enteredSets(four)).toEqual([]);
    expect(scoreString(four)).toBeUndefined();
  });

  it('completes a match', () => {
    const played = tap(pad(), 4, 6, 3, 6);

    expect(isComplete(played)).toBe(true);
    expect(winningSide(played)).toBe(1);
    expect(scoreString(played)).toBe('6-4 6-3');
  });

  it('backspace undoes the most recent tap, in reverse order', () => {
    const sixFour = tap(pad(), 4, 6);

    // Side 1 is undone before side 2, because entry fills side 2 FIRST and side 1 therefore holds the more
    // recent digit. A backspace that ate the wrong side would be maddening at speed.
    const once = back(sixFour);
    expect(readout(once, 2)).toEqual([4]);
    expect(dialPadReadout(once)[0].side1Score).toBe(0);
    expect(scoreString(once)).toBeUndefined();

    const twice = back(once);
    expect(dialPadReadout(twice)).toEqual([]);
  });

  it('backspace on an empty pad does nothing rather than throwing', () => {
    const empty = pad();
    expect(dialPadBackspace(empty)).toBe(empty);
  });

  it('Shift names the upper row', () => {
    // A shifted 6 after a lower 4 lands on the upper row of the same set: 6-4.
    const shifted = shiftTap(tap(pad(), 4), 6);
    expect(scoreString(shifted)).toBe('6-4');

    // A lone shifted 3 is on the upper row, with a genuine 0 opposite.
    const three = shiftTap(pad(), 3);
    expect(readout(three, 1)).toEqual([3]);
    expect(readout(three, 2)).toEqual([0]);
  });

  it('a shifted digit extends only the row it names', () => {
    // Lower `1` then `Shift+0` must not make the lower row a 10 just because it was typed last.
    const model = shiftTap(tap(pad('SET3-S:10/TB7'), 1), 0);
    expect(readout(model, 2)).toEqual([1]);
    expect(readout(model, 1)).toEqual([0]);
  });

  it('builds a two-digit games score where the FORMAT allows one', () => {
    // `SET3-S:10/TB7` permits 11, so 1 then 0 is ten — on the LOWER row, where entry begins.
    expect(readout(tap(pad('SET3-S:10/TB7'), 1, 0), 2)).toEqual([10]);
  });

  it('does NOT build one where the format forbids it — 1 then 0 is 1-0, not 10', () => {
    // In `S:6/TB7` the maximum is 7, so ten is not a games score and the 0 starts the opposing side.
    const model = tap(pad(), 1, 0);
    expect(readout(model, 2)).toEqual([1]);
    expect(readout(model, 1)).toEqual([0]);
    expect(scoreString(model)).toBe('0-1');
  });

  it('stops at two digits even in a timed set, which reports no maximum at all', () => {
    // A timed format returns `Infinity`, so an uncapped rule would pour every tap into one side forever.
    const model = tap(pad('SET1-S:T20'), 1, 5, 9);
    expect(readout(model, 2)).toEqual([15]);
    expect(readout(model, 1)).toEqual([9]);
  });

  it('offers the tiebreak only when the format has one AND the games can carry one', () => {
    expect(tiebreakKeyOffered(pad())).toBe(false);
    expect(tiebreakKeyOffered(tap(pad(), 6, 7))).toBe(true);
    expect(tiebreakKeyOffered(tap(pad('SET3-S:6NOAD'), 6, 7)), 'a format with no tiebreak never offers it').toBe(false);
  });

  it('seeds from a saved score, including a genuine 0', () => {
    const model = seeded([{ setNumber: 1, side1Score: 6, side2Score: 0, winningSide: 1 }]);
    expect(readout(model, 1)).toEqual([6]);
    expect(readout(model, 2)).toEqual([0]);
  });

  it('seeds a saved TIEBREAK, so reopening a 7-6(3) shows its points', () => {
    const model = seeded([{ setNumber: 1, side1Score: 7, side2Score: 6, side2TiebreakScore: 3, winningSide: 1 }]);
    expect(scoreString(model)).toBe(SEVEN_SIX_THREE);
    expect(dialPadReadout(model)[0].side2TiebreakScore).toBe(3);
  });
});

/**
 * Tiebreak MODE — the keypad's one modal state: the digits mean games until the Tiebreak key is pressed
 * and points afterwards. Whether the key reports its state (`aria-pressed`) is the story's.
 */
describe('Dial Pad — tiebreak mode', () => {
  it('attaches the points to the set they were played in', () => {
    expect(scoreString(tapTiebreak(tap(pad(), 6, 7), 3))).toBe(SEVEN_SIX_THREE);
  });

  it('takes more than one digit, so a tiebreak to 12-10 can be entered', () => {
    const model = tapTiebreak(tap(pad(), 6, 7), 1, 0);
    expect(scoreString(model)).toBe('7-6(10)');
    expect(enteredSets(model)[0].side1TiebreakScore).toBe(12);
  });

  it('WITHHOLDS the tiebreak on a 6-2, so no stray points can be entered', () => {
    // CA, 2026-10-08: the key is not offered until the games can carry a tiebreak, so the stray points
    // cannot be typed in the first place. The region leaves Tiebreak mode whenever the key is withdrawn,
    // so the next digit is games: 6-2 finishes the set, and the 3 begins set two on the lower row.
    const sixTwo = tap(pad(), 2, 6);
    expect(tiebreakKeyOffered(sixTwo)).toBe(false);

    const next = tap(sixTwo, 3);
    expect(scoreString(next)).not.toMatch(/\(/);
    expect(readout(next, 1)).toEqual([6, 0]);
    expect(readout(next, 2)).toEqual([2, 3]);
  });

  it('backspace eats the tiebreak BEFORE the games it belongs to', () => {
    // A backspace that ate the set score first would leave the tiebreak orphaned on a score that no longer
    // exists.
    const withPoints = tapTiebreak(tap(pad(), 6, 7), 3);
    expect(scoreString(withPoints)).toBe(SEVEN_SIX_THREE);

    const once = back(withPoints);
    expect(scoreString(once)).toBe('7-6');

    const twice = back(once);
    expect(scoreString(twice)).toBeUndefined();
    expect(readout(twice, 2), 'the lower row, typed first, is what remains').toEqual([6]);
  });

  it('backspace takes a digit off a two-digit tiebreak and re-derives the winner', () => {
    const ten = tapTiebreak(tap(pad(), 6, 7), 1, 0);
    expect(scoreString(back(ten))).toBe('7-6(1)');
  });
});

/**
 * A MATCH TIEBREAK on the keypad. `SET1-S:TB10` was unenterable there (measured 2026-09-28: 1, 0, 8 gave
 * 1-0 and dropped the 8). Its own cells ARE the points, exactly as in Dynamic Sets.
 */
describe('Dial Pad — a match tiebreak', () => {
  it("takes ONE number — the low score — and derives the winner's", () => {
    // CA, 2026-09-28: *"For tiebreaks the lower score should always be entered first."*
    const model = tap(pad(MATCH_TIEBREAK_FORMAT), 8);
    const [set] = enteredSets(model);
    expect(set.side1TiebreakScore).toBe(10);
    expect(set.side2TiebreakScore).toBe(8);
    expect(scoreString(model)).toBe('[10-8]');
  });

  it('accumulates digits into that one number — `1` then `1` is eleven', () => {
    const model = tap(pad(MATCH_TIEBREAK_FORMAT), 1, 1);
    const [set] = enteredSets(model);
    expect(set.side2TiebreakScore, 'the low score, on the lower row').toBe(11);
    expect(set.side1TiebreakScore, 'and its complement, low + 2').toBe(13);
    expect(scoreString(model)).toBe('[13-11]');
  });

  it('`shift+1` then `shift+1` puts the same eleven on the UPPER row', () => {
    // Shift chooses which ROW the low score belongs to — not which row the next digit lands in.
    const model = shiftTap(pad(MATCH_TIEBREAK_FORMAT), 1, 1);
    const [set] = enteredSets(model);
    expect(set.side1TiebreakScore, 'the low score, on the upper row').toBe(11);
    expect(set.side2TiebreakScore).toBe(13);
    expect(scoreString(model)).toBe('[11-13]');
  });

  it('runs long, because a match tiebreak legitimately does', () => {
    expect(scoreString(tap(pad(MATCH_TIEBREAK_FORMAT), 1, 3))).toBe('[15-13]');
  });

  it('backspace takes a digit off the TYPED number and recomputes the other', () => {
    // The cells hold one typed value and one derived one; eating the derived cell would leave a pair the
    // operator never entered.
    const model = tap(pad(MATCH_TIEBREAK_FORMAT), 1, 3);
    expect(scoreString(back(model))).toBe('[10-1]');
  });

  it('seeds a saved match tiebreak, so reopening one is not a blank keypad', () => {
    const model = seeded(
      [{ setNumber: 1, side1TiebreakScore: 10, side2TiebreakScore: 8, winningSide: 1 }],
      MATCH_TIEBREAK_FORMAT
    );
    expect(scoreString(model)).toBe('[10-8]');
    expect(dialPadReadout(model)).toEqual([
      { setNumber: 1, side1Score: 0, side2Score: 0, side1TiebreakScore: 10, side2TiebreakScore: 8 }
    ]);
  });

  it('enters a DECIDING match tiebreak after two ordinary sets', () => {
    // `SET3-S:6/TB7-F:TB10`: only the third set is tiebreak-only, so the exemption is per-SET.
    const model = tap(pad('SET3-S:6/TB7-F:TB10'), 4, 6, 6, 4, 8);
    const sets = enteredSets(model);
    expect(sets.map((set) => [set.side1Score, set.side2Score])).toEqual([
      [6, 4],
      [4, 6],
      [0, 0]
    ]);
    expect(sets[2].side1TiebreakScore).toBe(10);
    expect(sets[2].side2TiebreakScore).toBe(8);
    expect(scoreString(model)).toBe('6-4 4-6 [10-8]');
    expect(isComplete(model)).toBe(true);
    expect(error(model)).toBeUndefined();
  });

  it('offers no Tiebreak key, because the cells already ARE the tiebreak; a MIXED format keeps it', () => {
    expect(tiebreakKeyOffered(pad(MATCH_TIEBREAK_FORMAT))).toBe(false);
    expect(tiebreakKeyOffered(tap(pad('SET3-S:6/TB7-F:TB10'), 6, 7))).toBe(true);
  });
});

// ── Free Score ─────────────────────────────────────────────────────────

const freeScore = (initialText?: string) => createFreeScoreRegion({ matchUpFormat: FORMAT, initialText });
const note = (text: string) => {
  const region = freeScore(text);
  return freeScoreNote({ text, result: parseScore(text, FORMAT), model: region.store.get() });
};

describe('Free Score', () => {
  it('commits typed text to the model', () => {
    const model = freeScore('6-4 6-3').store.get();
    expect(isComplete(model)).toBe(true);
    expect(winningSide(model)).toBe(1);
    expect(enteredSets(model).map((set) => [set.side1Score, set.side2Score])).toEqual([
      [6, 4],
      [6, 3]
    ]);
  });

  it('an unfinished score is not complete', () => {
    expect(isComplete(freeScore('6-4').store.get())).toBe(false);
  });

  it('says whether the text was UNDERSTOOD, separately from what will be submitted', () => {
    // A typo produces a sane band and an unparseable field; only the note can say so.
    expect(note('6-4 6-3')).toEqual({ tone: 'good', text: `A complete match under ${FORMAT}` });
    const nonsense = note('qqq');
    expect(nonsense.tone).toBe('error');
    expect(nonsense.text).toBe('Not a score this format allows');
    expect(note('6-4').tone, 'a score in progress is neither good nor an error').toBe('idle');
    expect(note('')).toEqual({ tone: 'idle', text: '' });
  });

  it('seeds from an initial score', () => {
    const region = freeScore('6-4 6-3');
    expect(region.getText()).toBe('6-4 6-3');
    expect(isComplete(region.store.get())).toBe(true);
  });
});

describe('Free Score parses endings', () => {
  it('a typed "ret" is recognised, but does not say WHO retired', () => {
    // `validateScore('6-4 2-1', fmt, RETIRED)` returns no winningSide, because the text genuinely does not
    // say which player retired. The resolution therefore names the retirement and awaits a winner, so
    // Submit stays closed until the operator says on which row it happened (the story asserts the card).
    const region = freeScore(RET_TEXT);
    expect(region.matchUpStatus?.()).toBe(RETIRED);

    const resolution = resolveReportedEnding(region.matchUpStatus?.(), winningSide(region.store.get()));
    expect(resolution.matchUpStatus).toBe(RETIRED);
    expect(resolution.hasEnding).toBe(true);
    expect(resolution.isValid, 'a retirement with no named side must not be submittable').toBe(false);
    expect(scoreString(region.store.get())).toBe('6-4 2-1');
  });

  it('a typed "wo" becomes a walkover', () => {
    expect(freeScore('wo').matchUpStatus?.()).toBe(WALKOVER);
  });
});

describe("the score line is the factory's, and the approaches agree", () => {
  it('Free Score quotes the canonical line, not the shorthand typed', () => {
    expect(scoreString(freeScore('76(3) 64').store.get())).toBe('7-6(3) 6-4');
  });

  it('puts the tiebreak LAST when side 2 wins the set — `6-7(3)`, not `6(3)-7`', () => {
    // Every case in the suite was once a side-1 win, which is how `setTBlast: false` survived a first pass.
    expect(scoreString(freeScore('6-7(3)').store.get())).toBe('6-7(3)');
  });

  it('Dial Pad and Free Score render the same score the same way', () => {
    const sets = [
      { setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 }
    ];
    expect(scoreString(seeded(sets))).toBe(SEVEN_SIX_THREE);
    expect(scoreString(freeScore('7-6(3)').store.get())).toBe(SEVEN_SIX_THREE);
  });

  it('replaceSets commits a parse without changing a model that already holds it', () => {
    const model = freeScore('6-4 6-3').store.get();
    expect(replaceSets(model, enteredSets(model))).toBe(model);
  });
});
