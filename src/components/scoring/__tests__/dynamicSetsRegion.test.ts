/**
 * The Dynamic Sets rules, in node.
 *
 * What a field's text means for the model is `logic/dynamicSetsEntry.ts` — digits cleaned, replayed into
 * the cell with refusal, the Smart complement once per set — and what the grid shows and accepts is the
 * model's selectors (`columns`, `error`, `isComplete`, `scoreString`). `type` below is the region's own
 * `onGamesTyped`/`onTiebreakTyped` composition of those, over a frozen model.
 *
 * Everything that needs a browser — elements kept or rebuilt, focus, the tiebreak column folding and
 * reopening on focus, the raised digit and its spoken twin, the Smart toggle, aria labels, the endings,
 * and the headings standing over their cells — is `DynamicSetsEntryTests.stories.ts`.
 */
import { offersComplement, complementFired, replayDigits, cleanDigits } from '../logic/dynamicSetsEntry';
import { createScoreEntryModel, chooseEnding } from '../logic/scoreEntryModel';
import { deepFreeze, G, TB } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { raisedTiebreakPoints } from '../logic/dynamicSetsEntry';
import { describe, it, expect } from 'vitest';
import {
  unrecordedTiebreakNote,
  enteredSets,
  scoreString,
  winningSide,
  isComplete,
  cellValue,
  columns,
  error
} from '../logic/scoreEntrySelectors';

import type { CellRef, ScoreEntryModel } from '../logic/scoreEntryModel';
import type { SetScore } from '../types';

const { SUSPENDED } = matchUpStatusConstants;

const BEST_OF_3 = 'SET3-S:6/TB7';
const BEST_OF_5 = 'SET5-S:6/TB7';
const MATCH_TIEBREAK = 'SET1-S:TB10';
const SIDE_NAMES: [string, string] = ['Rosalind Lem', 'Derrick Ellul'];

type Entry = { model: ScoreEntryModel; used: ReadonlySet<number>; smart: boolean };

const start = (over: { matchUpFormat?: string; sets?: SetScore[]; smart?: boolean } = {}): Entry => ({
  model: deepFreeze(
    createScoreEntryModel({ matchUpFormat: over.matchUpFormat ?? BEST_OF_3, approach: 'dynamicSets', sets: over.sets })
  ),
  used: new Set(),
  smart: over.smart !== false
});

/** A field's whole text typed into one cell, as the region does on `input`. 1-based set, like `data-set`. */
function type(entry: Entry, cell: CellRef, text: string): Entry {
  const complement = offersComplement(entry.model, cell, { smart: entry.smart, used: entry.used });
  const model = replayDigits(entry.model, cell, cleanDigits(text), complement);
  const used = new Set(entry.used);
  if (complementFired(entry.model, model, cell)) used.add(cell.setIndex);
  return { ...entry, model, used };
}
const games = (side: 1 | 2, set: number) => G(set - 1, side);
const points = (side: 1 | 2, set: number) => TB(set - 1, side);
const enterSet = (entry: Entry, set: number, side1: string, side2: string) =>
  type(type(entry, games(1, set), side1), games(2, set), side2);
const value = (entry: Entry, cell: CellRef) => cellValue(entry.model, cell.setIndex, cell.side, cell.kind);
const shown = (entry: Entry, editingSet?: number) =>
  columns(entry.model, { editingSet }).map((slot) => `${slot.kind === 'tiebreak' ? 'TB' : 'G'}${slot.setIndex + 1}`);

describe('the grid reveals one set at a time — CA, 2026-09-27', () => {
  it('opens with only the first set, whatever the best-of', () => {
    for (const matchUpFormat of [BEST_OF_3, BEST_OF_5]) expect(shown(start({ matchUpFormat }))).toEqual(['G1']);
  });

  it('stops revealing once the match is decided', () => {
    const decided = enterSet(enterSet(start(), 1, '6', '4'), 2, '6', '3');
    expect(shown(decided)).toEqual(['G1', 'G2']);
    expect(isComplete(decided.model)).toBe(true);
  });

  it('does reveal a third set when the match is level', () => {
    const level = enterSet(enterSet(start(), 1, '6', '4'), 2, '3', '6');
    expect(shown(level)).toEqual(['G1', 'G2', 'G3']);
    expect(isComplete(level.model)).toBe(false);
  });

  it('falls back to best-of-3 for an unparseable format rather than rendering nothing', () => {
    const level = enterSet(enterSet(start({ matchUpFormat: 'NOT-A-FORMAT' }), 1, '6', '4'), 2, '3', '6');
    expect(shown(level)).toEqual(['G1', 'G2', 'G3']);
  });
});

describe('typing a score', () => {
  it('reaches the score line, and a finished match names its winner', () => {
    const one = enterSet(start(), 1, '6', '4');
    expect(scoreString(one.model)).toBe('6-4');
    expect(isComplete(one.model), 'one set of three is not a result').toBe(false);

    const two = enterSet(one, 2, '6', '3');
    expect(isComplete(two.model), 'two sets of three IS a result').toBe(true);
    expect(winningSide(two.model)).toBe(1);
  });

  it('names the other winner when the other side wins', () => {
    let entry = start();
    entry = type(entry, games(2, 1), '6');
    entry = type(entry, games(1, 1), '4');
    entry = type(entry, games(2, 2), '6');
    entry = type(entry, games(1, 2), '3');
    expect(isComplete(entry.model)).toBe(true);
    expect(winningSide(entry.model)).toBe(2);
  });

  it('accepts digits only, stripping a non-digit from anywhere in the field', () => {
    expect(cleanDigits('6a')).toBe('6');
    expect(cleanDigits('a6')).toBe('6');
    expect(cleanDigits('a4')).toBe('4');
    expect(cleanDigits('07')).toBe('7');
    expect(cleanDigits('0'), 'a set lost to love is a score').toBe('0');

    const entry = type(type(start({ smart: false }), games(1, 1), '6a'), games(2, 1), '4');
    expect(enteredSets(entry.model)[0]).toMatchObject({ side1Score: 6, side2Score: 4 });
  });

  it('reports no set at all until both sides are entered', () => {
    // A lone 6 used to read as 6-0, which completed the set, revealed the next one, and put a score in
    // the band the operator had not typed.
    const lone = type(start({ smart: false }), games(1, 1), '6');
    expect(enteredSets(lone.model)).toEqual([]);
    expect(scoreString(lone.model)).toBeUndefined();
    expect(shown(lone), 'the next set must not open on half a score').toEqual(['G1']);
  });

  it("refuses a games value the format cannot produce — CA's 3-44", () => {
    // The keystroke is refused rather than substituted: `44` stands as `4`, and an `8` as nothing.
    const entry = type(start({ smart: false }), games(1, 1), '44');
    expect(value(entry, games(1, 1))).toBe(4);
    expect(value(type(entry, games(2, 1), '8'), games(2, 1))).toBeUndefined();
  });

  it('treats a cleared field as not-entered, not as zero', () => {
    const sixFour = enterSet(start(), 1, '6', '4');
    expect(scoreString(sixFour.model)).toBe('6-4');

    const cleared = type(type(sixFour, games(1, 1), ''), games(2, 1), '');
    expect(enteredSets(cleared.model)).toEqual([]);
    expect(scoreString(cleared.model)).toBeUndefined();
  });

  it('records a genuine 0 — a set lost to love is not an empty field', () => {
    const love = enterSet(start(), 1, '6', '0');
    expect(scoreString(love.model)).toBe('6-0');
    expect(enteredSets(love.model)[0].side2Score).toBe(0);
  });
});

describe('smart complements', () => {
  it('fills the opposing cell from an unambiguous digit', () => {
    const entry = type(start(), games(1, 1), '4');
    expect(value(entry, games(2, 1))).toBe(6);
    expect(scoreString(entry.model)).toBe('4-6');
  });

  it('fills the other direction too — it follows the cell typed into, not side 1', () => {
    const entry = type(start(), games(2, 1), '4');
    expect(value(entry, games(1, 1))).toBe(6);
    expect(value(entry, games(2, 1))).toBe(4);
  });

  it('completes a 6 to a 7 — CA, 2026-09-27', () => {
    expect(value(type(start(), games(1, 1), '6'), games(2, 1))).toBe(7);
  });

  it('and the operator can still win 6-4, because the complement fires once per set', () => {
    const entry = type(type(start(), games(1, 1), '6'), games(2, 1), '4');
    expect(scoreString(entry.model)).toBe('6-4');
  });

  it('leaves a digit ABOVE setTo alone — a 7 cannot be a loser score in a set to 6', () => {
    expect(value(type(start(), games(1, 1), '7'), games(2, 1))).toBeUndefined();
  });

  it('does not fire twice in one set, so a correction by hand stands', () => {
    // `complement(5)` is 7, so without the once-per-set record side 2 would move from 6 to 7.
    const first = type(start(), games(1, 1), '4');
    expect(value(first, games(2, 1))).toBe(6);
    expect(first.used.has(0)).toBe(true);

    const corrected = type(first, games(1, 1), '5');
    expect(value(corrected, games(2, 1)), 'the complement must not fire a second time').toBe(6);
    expect(value(corrected, games(1, 1))).toBe(5);
  });

  it('fills nothing while switched off, and fills again once switched on', () => {
    const off = type(start({ smart: false }), games(1, 1), '4');
    expect(value(off, games(2, 1))).toBeUndefined();

    // Switching on clears the record of complements used, as the toggle does.
    const on = type(type({ ...off, smart: true, used: new Set() }, games(1, 1), ''), games(1, 1), '4');
    expect(value(on, games(2, 1))).toBe(6);
  });

  it('a tiebreak cell and a tiebreak-only set complement every time, a games cell once per set', () => {
    const model = start().model;
    const used = new Set([0]);
    expect(offersComplement(model, games(1, 1), { smart: true, used })).toBe(false);
    expect(offersComplement(model, games(1, 2), { smart: true, used })).toBe(true);
    expect(offersComplement(model, points(1, 1), { smart: true, used })).toBe(true);
    expect(offersComplement(start({ matchUpFormat: MATCH_TIEBREAK }).model, games(1, 1), { smart: true, used })).toBe(
      true
    );
    expect(offersComplement(model, points(1, 1), { smart: false, used: new Set() })).toBe(false);
  });
});

describe('a saved score re-opens', () => {
  it('seeds every cell from the sets it was given, and shows no set never played', () => {
    const entry = start({
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
      ]
    });
    expect([1, 2].map((set) => [value(entry, games(1, set)), value(entry, games(2, set))])).toEqual([
      [6, 4],
      [6, 3]
    ]);
    expect(shown(entry)).toEqual(['G1', 'G2']);
    expect(isComplete(entry.model)).toBe(true);
    expect(scoreString(entry.model)).toBe('6-4 6-3');
  });

  it('seeds a genuine 0 rather than blanking it', () => {
    const entry = start({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 0, winningSide: 1 }] });
    expect(value(entry, games(2, 1))).toBe(0);
  });
});

/**
 * The tiebreak column, as the model decides it. CA, 2026-09-27, describing USTA Tournament Desk: *"a TB
 * column of entry fields appears and also has auto-complete so if TB7 then entering a 3 in one
 * autocompletes the other to 7"*. Its folding, reopening on focus and the raised digit are the story's.
 */
describe('the tiebreak column — CA, 2026-09-27', () => {
  const sevenSix = (over: Parameters<typeof start>[0] = {}) => enterSet(start(over), 1, '7', '6');

  it('does not exist until the games call for one', () => {
    expect(shown(start())).toEqual(['G1']);
    expect(shown(enterSet(start(), 1, '6', '4')), 'a 6-4 needs no tiebreak').toEqual(['G1', 'G2']);
  });

  it('appears on a 7-6, with the second set open beside it — the points are offered, not owed', () => {
    // CA, 2026-11-07: until then the second set stayed closed until the points were in, while the engine
    // had recorded a bare 7-6 since ruling V11.
    const entry = sevenSix();
    expect(shown(entry)).toEqual(['G1', 'TB1', 'G2']);
    expect(isComplete(entry.model)).toBe(false);

    const played = enterSet(entry, 2, '6', '3');
    expect(isComplete(played.model)).toBe(true);
    expect(scoreString(played.model)).toBe('7-6 6-3');
    expect(unrecordedTiebreakNote(played.model)).toBe('1st set: tiebreak points not recorded');
    const [first] = enteredSets(played.model);
    expect(first.winningSide).toBe(1);
    expect(first.side1TiebreakScore).toBeUndefined();
  });

  it('a pair half-typed is not a finished set: one side’s points without the other’s', () => {
    const half = type(sevenSix({ smart: false }), points(2, 1), '3');
    expect(shown(half), 'the second set closes while the pair is mid-keystroke').toEqual(['G1', 'TB1']);

    const whole = type(half, points(1, 1), '7');
    expect(shown(whole)).toContain('G2');
    expect(scoreString(whole.model)).toBe('7-6(3)');
  });

  it("CA's gesture: a 0 typed over the derived 7 reads 0-0, which is no points — the cells clear", () => {
    const love = type(sevenSix(), points(2, 1), '0'); // the complement fills the winner's 7
    expect(scoreString(love.model)).toBe('7-6(0)');

    const none = type(love, points(1, 1), '0');
    expect(scoreString(none.model)).toBe('7-6');
    expect(value(none, points(1, 1))).toBeUndefined();
    expect(value(none, points(2, 1))).toBeUndefined();
    expect(shown(none), 'and the set is settled without points').toContain('G2');
  });

  it('autocompletes the other side to the format target — a 3 in a TB7 gives 7', () => {
    // Which is which matters: side 1 won the set 7-6, so side 1 took the tiebreak 7-3.
    const entry = type(sevenSix(), points(2, 1), '3');
    const [set] = enteredSets(entry.model);
    expect(set.side1TiebreakScore).toBe(7);
    expect(set.side2TiebreakScore).toBe(3);
    expect(scoreString(entry.model)).toBe('7-6(3)');
  });

  it('takes the target from the FORMAT, not a hard-coded 7', () => {
    const entry = type(sevenSix({ matchUpFormat: 'SET3-S:6/TB10' }), points(2, 1), '4');
    const [set] = enteredSets(entry.model);
    expect(set.side1TiebreakScore).toBe(10);
    expect(set.side2TiebreakScore).toBe(4);
  });

  it('a tiebreak-ONLY set has no separate column — its own cells are the points', () => {
    const entry = enterSet(start({ matchUpFormat: MATCH_TIEBREAK }), 1, '10', '8');
    expect(shown(entry)).toEqual(['G1']);
    const [set] = enteredSets(entry.model);
    expect(set.side1TiebreakScore).toBe(10);
    expect(set.side2TiebreakScore).toBe(8);
    // The factory's own form for a tiebreak-only set, `[10-8]`.
    expect(scoreString(entry.model)).toBe('[10-8]');
  });

  it('completes from the games LOSER, and runs long when it has to', () => {
    const entry = type(sevenSix(), points(2, 1), '6');
    const [set] = enteredSets(entry.model);
    expect(set.side2TiebreakScore).toBe(6);
    expect(set.side1TiebreakScore).toBe(8);
    expect(error(entry.model)).toBeUndefined();
  });

  it('does NOT complete from the games WINNER, whose points determine nothing', () => {
    const entry = type(sevenSix(), points(1, 1), '7');
    expect(value(entry, points(2, 1)), "the loser's points stay for the operator to enter").toBeUndefined();
    expect(shown(entry), 'and the column stays').toContain('TB1');
  });

  it('raises the points on the LOSING side only — `7-6³`', () => {
    const entry = type(sevenSix(), points(2, 1), '3');
    expect(raisedTiebreakPoints(entry.model, 0, 2)).toBe(3);
    expect(raisedTiebreakPoints(entry.model, 0, 1)).toBeUndefined();
    // one side's points alone show on that side
    const half = type(sevenSix({ smart: false }), points(1, 1), '7');
    expect(raisedTiebreakPoints(half.model, 0, 1)).toBe(7);
  });

  it('carries the tiebreak through to the submitted outcome', () => {
    const entry = enterSet(type(sevenSix(), points(2, 1), '3'), 2, '6', '4');
    const sets = enteredSets(entry.model);
    expect(sets).toHaveLength(2);
    expect(sets[0].side2TiebreakScore).toBe(3);
    expect(sets[0].side1TiebreakScore).toBe(7);
    expect(isComplete(entry.model)).toBe(true);
    expect(scoreString(entry.model)).toBe('7-6(3) 6-4');
  });

  it('a second set can have its own tiebreak — each set independently', () => {
    const entry = enterSet(type(sevenSix(), points(2, 1), '3'), 2, '6', '7');
    // editing set 2: its own column shows, set 1's stays folded, and a level match opens the third
    expect(shown(entry, 1)).toEqual(['G1', 'G2', 'TB2', 'G3']);
  });
});

/**
 * Integrity — the four holes CA found on 2026-09-27: *"... 3-7 is not a valid score and I can edit to be
 * '... 3-44 ...' ... the tiebreak score floats between entry cells ... 7-6 with the winning side having 3
 * and the losing side having tiebreak 7"*. The band showing the fault, and Submit staying shut under an
 * ending, are the card's and are in the story.
 */
describe('integrity — CA, 2026-09-27', () => {
  const err = (entry: Entry) => error(entry.model, { sideNames: SIDE_NAMES });
  const threeSeven = () => start({ sets: [{ setNumber: 1, side1Score: 3, side2Score: 7, winningSide: 2 }] });

  it("cannot type CA's 3-7 at all — the clamp refuses the 7", () => {
    const entry = type(type(start({ smart: false }), games(1, 1), '3'), games(2, 1), '7');
    expect(value(entry, games(2, 1)), 'a 7 is unreachable when the opponent has 3').toBeUndefined();
    expect(err(entry)).toBeUndefined();
  });

  it('catches a SEEDED 3-7, which never passed through the clamp, and it is not a result', () => {
    expect(err(threeSeven())).toMatch(/^1st set:.*must be at least 5/);
    expect(isComplete(threeSeven().model)).toBe(false);
  });

  it('names the set by its ordinal, not the validator\'s "Set 1"', () => {
    const entry = start({
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 3, side2Score: 7, winningSide: 2 }
      ]
    });
    expect(err(entry)).toMatch(/^2nd set:/);
  });

  it('an ending does not make an impossible score possible', () => {
    const suspended = {
      ...threeSeven(),
      model: chooseEnding(threeSeven().model, { kind: 'match', status: SUSPENDED })
    };
    expect(err(suspended)).toMatch(/must be at least 5/);
  });

  it('clears the fault when the score is corrected', () => {
    const fixed = type(type(threeSeven(), games(2, 1), '4'), games(1, 1), '6');
    expect(err(fixed)).toBeUndefined();
    expect(scoreString(fixed.model)).toBe('6-4');
  });

  it('does NOT flag an in-progress set, which is the commonest state there is', () => {
    const entry = enterSet(enterSet(start({ smart: false }), 1, '6', '4'), 2, '2', '1');
    expect(err(entry)).toBeUndefined();
    expect(scoreString(entry.model)).toBe('6-4 2-1');
  });

  it('drops a tiebreak whose games no longer call for one — the score stopped "floating"', () => {
    // Editing a 7-6(3) down to 6-3 used to leave the points attached, and the band read `6-3(3)`.
    const withPoints = type(enterSet(start({ smart: false }), 1, '7', '6'), points(2, 1), '3');
    expect(scoreString(withPoints.model)).toBe('7-6(3)');

    const edited = enterSet(withPoints, 1, '6', '3');
    expect(scoreString(edited.model)).toBe('6-3');
    expect(enteredSets(edited.model)[0].side1TiebreakScore).toBeUndefined();
    expect(enteredSets(edited.model)[0].side2TiebreakScore).toBeUndefined();
  });

  it('rejects a tiebreak that contradicts who won the set', () => {
    const entry = type(type(enterSet(start({ smart: false }), 1, '7', '6'), points(1, 1), '3'), points(2, 1), '7');
    expect(err(entry)).toMatch(/Rosalind Lem won it, so they must win the tiebreak/);
  });

  it('accepts the tiebreak when it agrees with the set', () => {
    const entry = type(type(enterSet(start({ smart: false }), 1, '7', '6'), points(1, 1), '7'), points(2, 1), '3');
    expect(err(entry)).toBeUndefined();
    expect(scoreString(entry.model)).toBe('7-6(3)');
  });

  it('rejects a tied tiebreak — via the FACTORY, not a check of our own', () => {
    const entry = type(type(enterSet(start({ smart: false }), 1, '7', '6'), points(1, 1), '8'), points(2, 1), '8');
    expect(err(entry)).toBeTruthy();
    expect(isComplete(entry.model)).toBe(false);
  });

  it('still allows a legitimate match tiebreak of 10-8, which the shared max would have blocked', () => {
    const entry = enterSet(start({ matchUpFormat: MATCH_TIEBREAK, smart: false }), 1, '10', '8');
    expect(value(entry, games(1, 1))).toBe(10);
    expect(enteredSets(entry.model)[0].side1TiebreakScore).toBe(10);
    expect(isComplete(entry.model)).toBe(true);
  });
});
