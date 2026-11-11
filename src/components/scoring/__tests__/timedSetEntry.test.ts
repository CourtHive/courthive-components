/**
 * Timed formats: which bolts the grid offers, and when nine of them make a result.
 *
 * CA, 2026-09-28: *"if there are still bolts left <enter> should advance to the next Bolt."* What the grid
 * offers is the model's `columns`; when the score is finished is `isComplete`. Typing two digits into a
 * bolt, the caret surviving the re-render a reveal causes, and Enter moving on or submitting are browser
 * behaviour and live in `DynamicSetsEntryTests.stories.ts` (Timed bolts).
 */
import { createScoreEntryModel } from '../logic/scoreEntryModel';
import { columns, isComplete } from '../logic/scoreEntrySelectors';
import { replayDigits } from '../logic/dynamicSetsEntry';
import { G } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { describe, it, expect } from 'vitest';

import type { ScoreEntryModel } from '../logic/scoreEntryModel';

/** Nine ten-minute bolts. `SET9-…` does NOT parse — measured; the nine-set form is `SET9X`. */
const NINE_BOLTS = 'SET9X-S:T10';

/** Bolts already won by side 1 — enough to "decide" the match by a games-set reading of it. */
const wonBolts = (count: number) =>
  Array.from({ length: count }, (_unused, index) => ({
    setNumber: index + 1,
    side1Score: 22,
    side2Score: 21,
    winningSide: 1
  }));

const open = (sets?: any[]) => createScoreEntryModel({ matchUpFormat: NINE_BOLTS, approach: 'dynamicSets', sets });
const bolts = (model: ScoreEntryModel) => columns(model).map((slot) => slot.setIndex + 1);
/** One bolt as an operator types it — lower row first, two digits each, no complement for a timed set. */
const typeBolt = (model: ScoreEntryModel, bolt: number, lower: string, upper: string) =>
  replayDigits(replayDigits(model, G(bolt - 1, 2), lower, true), G(bolt - 1, 1), upper, true);

describe('a nine-bolt format plays nine bolts', () => {
  it('keeps revealing bolts after one side has taken five of them', () => {
    // `shouldCreateNextSet` refused once the match read as decided — at EXACTLY five bolts won — so bolts
    // stopped being revealed at 5 and resumed at 6, which is nobody's rule.
    expect(bolts(open(wonBolts(5)))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('stops at the ninth, where there is genuinely nothing left', () => {
    expect(bolts(open(wonBolts(9)))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('a DRAWN bolt is an ordinary result', () => {
  it('reveals the next bolt, though nobody won it', () => {
    // A tied 21-21 resolves no `winningSide`, so a draw used to reveal no successor.
    expect(bolts(typeBolt(open(), 1, '21', '21'))).toEqual([1, 2]);
  });

  it('a two-digit value takes both digits in a bolt', () => {
    const model = typeBolt(open(), 1, '21', '22');
    expect(model.sets[0]).toEqual({ side1: 22, side2: 21 });
  });
});

describe('nine bolts entered one by one make a finished score', () => {
  it('is a result once the ninth bolt is in, and not one bolt before', () => {
    // The bolts ALTERNATE, so after eight the match stands 4-4 and only the ninth can settle it. Had side 1
    // won every bolt, the score completes at the fifth (measured), and the ninth would prove nothing.
    let model = open();
    for (let bolt = 1; bolt <= 8; bolt += 1) {
      const side1Wins = bolt % 2 === 1;
      model = typeBolt(model, bolt, side1Wins ? '21' : '22', side1Wins ? '22' : '21');
    }
    expect(bolts(model), 'the ninth bolt is offered').toContain(9);
    expect(isComplete(model), 'level at four bolts each: not a finished result').toBe(false);

    model = typeBolt(model, 9, '21', '22');
    expect(model.sets[8]).toEqual({ side1: 22, side2: 21 });
    expect(isComplete(model), 'all nine bolts in: the score is complete').toBe(true);
  });
});
