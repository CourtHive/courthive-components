/**
 * Notes 11/12 — which sets FOLD to their result. CA, 2026-09-30: *"when a set is complete ... not show
 * the entry fields and show the tiebreak score 7-6(3) on the low score side as 6^3"*.
 *
 * A set folds when the model says it is settled and the operator is not editing it. `isSettled` is the
 * model's half, here; the fold itself, the raised digit, the click back in and the readouts' superscript
 * are `DynamicSetsEntryTests.stories.ts` (Folded sets) and `FreeScoreEntryTests.stories.ts`.
 */
import { createScoreEntryModel, setCell } from '../logic/scoreEntryModel';
import { G, TB } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { isSettled } from '../logic/scoreEntrySelectors';
import { describe, it, expect } from 'vitest';

const FORMAT = 'SET3-S:6/TB7';

const open = (sets: any[], matchUpFormat = FORMAT) => createScoreEntryModel({ matchUpFormat, sets });

describe('a set is settled, and may fold, only when it is a finished set', () => {
  it('a 7-6 with both tiebreak points in is settled; the set after it, in progress, is not', () => {
    const model = open([
      { setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 },
      { setNumber: 2, side1Score: 2, side2Score: 1 }
    ]);
    expect(isSettled(model, 0)).toBe(true);
    expect(isSettled(model, 1)).toBe(false);
  });

  it('mid-tiebreak — one side of the pair typed — the set is still the operator’s', () => {
    const half = setCell(open([{ setNumber: 1, side1Score: 7, side2Score: 6 }]), TB(0, 1), 7);
    expect(isSettled(half, 0)).toBe(false);
    expect(isSettled(setCell(half, TB(0, 2), 3), 0)).toBe(true);
  });

  it('a set with no tiebreak is settled on its games alone', () => {
    expect(isSettled(open([{ setNumber: 1, side1Score: 6, side2Score: 4 }]), 0)).toBe(true);
    expect(isSettled(setCell(open([]), G(0, 1), 6), 0), 'one side is not a set').toBe(false);
  });

  it('a timed bolt is settled by the format as soon as both sides are in', () => {
    // Which is why the region must never fold the set UNDER EDIT: 2-21 is settled while 22 is being typed.
    const bolt = setCell(setCell(open([], 'SET3X-S:T10'), G(0, 2), 21), G(0, 1), 2);
    expect(isSettled(bolt, 0)).toBe(true);
  });
});
