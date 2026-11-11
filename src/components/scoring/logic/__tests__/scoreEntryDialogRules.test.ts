/**
 * The dialog's seed, reopened-result and format-change rules, asked directly of `scoreEntryDialogRules.ts`.
 *
 * These were halves of the happy-dom `__tests__/scoreEntryDialog.test.ts`, which opened a modal to reach
 * them. The halves that need the modal — focus, keys, menus, `inert` — are in
 * `src/stories/ScoreEntryDialogTests.stories.ts`.
 */
import { dialogSeed, formatChangeReport, reopensResult } from '../scoreEntryDialogRules';
import { createScoreEntryModel, changeFormat } from '../scoreEntryModel';
import { enteredSets, scoreString } from '../scoreEntrySelectors';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { frozen } from './scoreEntryModelTestHelpers';
import { describe, expect, it } from 'vitest';

const { RETIRED, COMPLETED, SUSPENDED, DOUBLE_WALKOVER } = matchUpStatusConstants;

const FORMAT = 'SET3-S:6/TB7';
const SHORT_FORMAT = 'SET1-S:TB10';
/** A best-of-ONE: it has no position for a second set. */
const BEST_OF_ONE = 'SET1-S:6/TB7';
/** A best-of-three whose DECIDING set is a match tiebreak — only set 3's rule moves. */
const DECIDER_TB10 = 'SET3-S:6/TB7-F:TB10';

const SIX_FOUR = { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 };
const RECORDED_RETIREMENT = {
  matchUpFormat: FORMAT,
  matchUpStatus: RETIRED,
  winningSide: 1,
  score: { sets: [SIX_FOUR, { setNumber: 2, side1Score: 2, side2Score: 1 }] }
};

/** The model the dialog builds from what it was handed. */
const seeded = (params: Parameters<typeof dialogSeed>[0]) => frozen(dialogSeed(params));

describe('what the dialog opens on — dialogSeed', () => {
  it("hydrates the score AND the ending from a reopened matchUp — CA: *'open existing outcomes'*", () => {
    // The Free Score defect (2026-09-28) was a region seeded from nothing; every region now reads this model.
    const model = seeded({ matchUp: RECORDED_RETIREMENT });

    expect(scoreString(model)).toBe('6-4 2-1');
    expect(model.ending.sideEnding).toEqual({ sideNumber: 2, status: RETIRED });
  });

  it('reads the format off the matchUp when none is passed', () => {
    expect(dialogSeed({ matchUp: { matchUpFormat: SHORT_FORMAT, score: { sets: [] } } }).matchUpFormat).toBe(
      SHORT_FORMAT
    );
  });

  it('lets an explicitly passed format and explicitly passed sets win over the matchUp', () => {
    const seed = dialogSeed({ matchUpFormat: BEST_OF_ONE, sets: [SIX_FOUR], matchUp: RECORDED_RETIREMENT });

    expect(seed.matchUpFormat).toBe(BEST_OF_ONE);
    expect(seed.sets).toEqual([SIX_FOUR]);
    expect(seed.matchUp, 'the ending still comes from the matchUp').toBe(RECORDED_RETIREMENT);
  });
});

describe('a reopened RESULT is read before it is edited — reopensResult', () => {
  it('is a result with a winner, so no entry cell takes focus', () => {
    const matchUp = {
      matchUpFormat: FORMAT,
      matchUpStatus: COMPLETED,
      winningSide: 1,
      score: { sets: [SIX_FOUR, { setNumber: 2, side1Score: 6, side2Score: 4, winningSide: 1 }] }
    };
    expect(reopensResult(matchUp, seeded({ matchUp }))).toBe(true);
  });

  it('treats a double exit as a result too — there is nothing to type', () => {
    const matchUp = { matchUpFormat: FORMAT, matchUpStatus: DOUBLE_WALKOVER, score: { sets: [] } };
    expect(reopensResult(matchUp, seeded({ matchUp }))).toBe(true);
  });

  it('treats a score that decides the match by itself as a result, winner recorded or not', () => {
    const matchUp = {
      matchUpFormat: FORMAT,
      score: { sets: [SIX_FOUR, { setNumber: 2, side1Score: 6, side2Score: 3 }] }
    };
    expect(reopensResult(matchUp, seeded({ matchUp }))).toBe(true);
  });

  it('is NOT a result for a part-score with no winner, which is there to be finished', () => {
    const matchUp = {
      matchUpFormat: FORMAT,
      matchUpStatus: SUSPENDED,
      score: { sets: [SIX_FOUR, { setNumber: 2, side1Score: 2, side2Score: 1 }] }
    };
    expect(reopensResult(matchUp, seeded({ matchUp }))).toBe(false);
  });

  it('is never a result without a matchUp, whatever the sets say', () => {
    const decided = seeded({ matchUpFormat: FORMAT, sets: [SIX_FOUR, { setNumber: 2, side1Score: 6, side2Score: 3 }] });
    expect(reopensResult(undefined, decided)).toBe(false);
  });
});

describe('what a format change reports discarding — formatChangeReport', () => {
  it('names WHAT it discarded, so a host can say so rather than let it be discovered', () => {
    const sets = [SIX_FOUR, { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }];

    const report = formatChangeReport(sets, BEST_OF_ONE, FORMAT);

    expect(report?.discarded.map((set) => set.setNumber)).toEqual([2]);
    expect(report?.sets.map((set) => set.setNumber)).toEqual([1]);
    expect(report?.matchUpFormat).toBe(BEST_OF_ONE);
  });

  it('stays SILENT when the change costs the operator nothing — the control', () => {
    // Without this, a host would be told about every format change and would learn to ignore it.
    expect(formatChangeReport([SIX_FOUR], DECIDER_TB10, FORMAT)).toBeUndefined();
  });

  it("CLEARS a part-entered third set the new format turns into a match tiebreak — CA's own scenario", () => {
    // CA: *"obviously the first two sets don't need to change at all ... But if a partial 3rd set was entered
    // it would need to be trimmed away."* His format exactly — NOAD games as well as the TB10 decider.
    const NOAD_DECIDER = 'SET3-S:6NOAD/TB7-F:TB10';
    const sets = [
      SIX_FOUR,
      { setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 },
      { setNumber: 3, side1Score: 2, side2Score: 1 }
    ];

    const model = changeFormat(createScoreEntryModel({ matchUpFormat: FORMAT, sets }), NOAD_DECIDER);
    expect(model.sets).toEqual([{ side1: 6, side2: 4 }, { side1: 3, side2: 6 }, {}]);
    expect(formatChangeReport(sets, NOAD_DECIDER, FORMAT)?.discarded.map((set) => set.setNumber)).toEqual([3]);
  });

  it('keeps a complete but ILLEGAL set whose rule the change did not touch — previousMatchUpFormat', () => {
    // A 3-7 is complete and illegal. Under a change touching only the DECIDING set its rule did not move,
    // so it stays for the operator to fix. Without the previous format the validator discards it.
    const threeSeven = [{ setNumber: 1, side1Score: 3, side2Score: 7, winningSide: 2 }];

    expect(formatChangeReport(threeSeven, DECIDER_TB10, FORMAT)).toBeUndefined();
    expect(formatChangeReport(threeSeven, DECIDER_TB10)?.discarded, 'the control: the detector can fire').toHaveLength(
      1
    );

    // And the model the region is rebuilt from keeps it too, which is what the operator sees.
    const model = changeFormat(createScoreEntryModel({ matchUpFormat: FORMAT, sets: threeSeven }), DECIDER_TB10);
    expect(enteredSets(model).map((set) => [set.side1Score, set.side2Score])).toEqual([[3, 7]]);
  });
});
