/**
 * What the factory engine makes of the outcome shapes a score-entry host can send it: the engine contract
 * behind the "Over a Draw" story, without the dialog.
 *
 * Each case is one CA asked to see the engine's answer to (`scoreEntryNotes.txt` note 10, and the S7 brief
 * in `Mentat/planning/SCORE_ENTRY_STATE_ENGINE.md`). Where the answer is not the one CA expected, the test
 * pins what was MEASURED, so that a factory release which changes it announces itself here rather than in
 * a director's draw. `recordOutcome` is exactly what the story's Submit calls.
 *
 * One tournament per test: `buildDrawBehind` loads a fresh mocks-engine record into the singleton engine,
 * so nothing a previous test scored is standing when the next one starts.
 *
 * Moved from the retired happy-dom `scoringStories.test.ts`; its dialog-driving cases are play functions in
 * `src/stories/ScoreEntryOverADrawTests.stories.ts`.
 */
import { buildDrawBehind, engineMatchUp, recordOutcome, toEngineOutcome } from '../helpers/scoreEntryEngineHost';
import { tournamentEngine, matchUpStatusConstants, errorConditionConstants } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

const { COMPLETED, WALKOVER, TO_BE_PLAYED, IN_PROGRESS } = matchUpStatusConstants;
const { INVALID_SCORE, INVALID_VALUES } = errorConditionConstants;

/** "Wo [inj]" — a real entry in the shipped vocabulary. */
const WALKOVER_INJURY = 'W1';

const set = (setNumber: number, side1Score: number, side2Score: number, winningSide?: number) => ({
  setNumber,
  side1Score,
  side2Score,
  ...(winningSide ? { winningSide } : {})
});

function drawBehind() {
  const ref = buildDrawBehind();
  return { ref, held: () => engineMatchUp(ref) };
}

describe('the engine behind the score-entry dialog', () => {
  it('REFUSES 4-2 2-6 2-6 from a host that bypasses the card — a first set at 4-2 never finished', () => {
    // CA, note 10: *"I'm sure if this went to the factory it would return an error"*. Through 7.4.0 it did
    // not: the engine checked set bounds, not completeness. Factory #5096 refuses it — every set before the
    // last must be finished — so the card is no longer the only guard.
    const { ref, held } = drawBehind();
    const sets = [set(1, 4, 2), set(2, 2, 6, 2), set(3, 2, 6, 2)];

    const answer = recordOutcome(ref, { sets, winningSide: 2, matchUpStatus: COMPLETED });

    expect(answer.result.error?.code).toBe(INVALID_SCORE.code);
    expect(held().matchUpStatus, 'a refusal writes nothing').toBe(TO_BE_PLAYED);
    expect(held().winningSide).toBeUndefined();
  });

  it('REFUSES a 3-7 as well — it is inside the bounds, but no set under a tiebreak at six ends 7-3', () => {
    const { ref, held } = drawBehind();

    const answer = recordOutcome(ref, {
      sets: [set(1, 3, 7, 2), set(2, 6, 4, 1), set(3, 6, 4, 1)],
      winningSide: 1,
      matchUpStatus: COMPLETED
    });
    expect(answer.result.error?.code).toBe(INVALID_SCORE.code);
    expect(held().matchUpStatus).toBe(TO_BE_PLAYED);

    // The control: the same match with a finished first set is recorded, so the refusal is about 3-7.
    const control = recordOutcome(ref, {
      sets: [set(1, 3, 6, 2), set(2, 6, 4, 1), set(3, 6, 4, 1)],
      winningSide: 1,
      matchUpStatus: COMPLETED
    });
    expect(control.result.error).toBeUndefined();
    expect(held().score.scoreStringSide1).toBe('3-6 6-4 6-4');
  });

  it("REFUSES the dialog's score STRING, so a host that spreads the outcome is refused on every Submit", () => {
    const { ref, held } = drawBehind();
    const dialogOutcome = {
      score: '6-4 6-3',
      sets: [set(1, 6, 4, 1), set(2, 6, 3, 1)],
      winningSide: 1,
      matchUpStatus: COMPLETED
    };

    // The raw spread — what a host does when it has not read the engine's shape.
    const raw: any = tournamentEngine.setMatchUpStatus({ ...ref, outcome: { ...dialogOutcome } });
    expect(raw.error?.code).toBe(INVALID_VALUES.code);
    expect(held().matchUpStatus, 'and nothing was written').toBe(TO_BE_PLAYED);

    // The mapping: no string, the sets as `score.sets`. Falsified by forwarding `score` in `toEngineOutcome`.
    expect(typeof toEngineOutcome(dialogOutcome).score).toBe('object');
    const mapped = recordOutcome(ref, dialogOutcome);
    expect(mapped.result.success).toBe(true);
    expect(held().score.scoreStringSide1).toBe('6-4 6-3');
  });

  it('a `cleared` outcome sent as-is is NOT a clear; the empty-sets outcome is (measured 7.4.0)', () => {
    const { ref, held } = drawBehind();
    recordOutcome(ref, { sets: [set(1, 6, 4, 1), set(2, 6, 3, 1)], winningSide: 1, matchUpStatus: COMPLETED });
    expect(held().matchUpStatus).toBe(COMPLETED);

    // The field the dialog reports means nothing to the engine: the winner goes, the stale score stays, and
    // the matchUp reads as still being played.
    const raw: any = tournamentEngine.setMatchUpStatus({ ...ref, outcome: { cleared: true } });
    expect(raw.success).toBe(true);
    expect(held().matchUpStatus, 'a stale score left standing as in progress').toBe(IN_PROGRESS);
    expect(held().winningSide).toBeUndefined();
    expect(held().score.scoreStringSide1).toBe('6-4 6-3');

    // Through the host's mapping it is the clear CA asked for.
    const mapped = recordOutcome(ref, { cleared: true });
    expect(mapped.sent).toEqual({ score: { sets: [] }, matchUpStatusCodes: [] });
    expect(mapped.result.success).toBe(true);
    expect(held().matchUpStatus).toBe(TO_BE_PLAYED);
    expect(held().score?.scoreStringSide1 ?? '').toBe('');
  });

  it('top-level `sets` sent as-is are ignored: the winner is recorded with NO score (measured 7.5.0)', () => {
    const { ref, held } = drawBehind();
    const dialogOutcome = { sets: [set(1, 6, 4, 1), set(2, 6, 3, 1)], winningSide: 1, matchUpStatus: COMPLETED };

    // The engine reads the score from `score.sets` only. Sent at the top level the sets are never seen, and
    // with no score to validate, 7.5.0's completeness rule has nothing to refuse.
    const raw: any = tournamentEngine.setMatchUpStatus({ ...ref, outcome: { ...dialogOutcome } });
    expect(raw.success).toBe(true);
    expect(held().matchUpStatus).toBe(COMPLETED);
    expect(held().winningSide).toBe(1);
    expect(held().score?.scoreStringSide1 ?? '', 'a COMPLETED result with no score').toBe('');

    // The mapping moves them under `score`.
    recordOutcome(ref, dialogOutcome);
    expect(held().score.scoreStringSide1).toBe('6-4 6-3');
  });

  it('a `reasonCode` sent as-is is ignored: the walkover is recorded and its reason lost (measured 7.5.0)', () => {
    const { ref, held } = drawBehind();
    const dialogOutcome = { matchUpStatus: WALKOVER, winningSide: 1, reasonCode: WALKOVER_INJURY };

    const raw: any = tournamentEngine.setMatchUpStatus({ ...ref, outcome: { ...dialogOutcome } });
    expect(raw.success).toBe(true);
    expect(held().matchUpStatus).toBe(WALKOVER);
    expect(held().sideStatusCodes, 'the reason never reached the record').toBeUndefined();

    // The mapping sends it positionally, and the engine files it against the exiting side.
    const mapped = recordOutcome(ref, dialogOutcome);
    expect(mapped.sent.matchUpStatusCodes).toEqual(['', WALKOVER_INJURY]);
    expect(held().sideStatusCodes).toEqual({ 2: WALKOVER_INJURY });
  });
});
