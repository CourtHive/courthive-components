import { footerState, scoreEntryError, submission, holdsEntry, clearGate } from '../logic/scoreEntryRules';
import { isComplete, isSettled, matchUpStatus, error, enteredSets } from '../logic/scoreEntrySelectors';
import { createScoreEntryModel, chooseEnding, setCell } from '../logic/scoreEntryModel';
import { matchUpStatusConstants, scoreGovernor } from 'tods-competition-factory';
import { toEngineOutcome } from '../logic/engineOutcome';
import { describe, expect, it } from 'vitest';

import type { CellRef, ScoreEntryModel } from '../logic/scoreEntryModel';

const { COMPLETED, RETIRED, SUSPENDED, WALKOVER } = matchUpStatusConstants;
const TIMED = 'SET1-S:T15P';
const DECIDING = 'SET1-S:T15P/TB1';
const MESSAGE = 'Timed set requires at least one side to have scored';
const zero = { setNumber: 1, side1Score: 0, side2Score: 0 };
const G1: CellRef = { setIndex: 0, side: 1, kind: 'games' };
const G2: CellRef = { setIndex: 0, side: 2, kind: 'games' };

const modelFor = (matchUpFormat = TIMED, side1Score = 0, side2Score = 0) =>
  createScoreEntryModel({ matchUpFormat, sets: [{ ...zero, side1Score, side2Score }] });

describe('single timed set with no points', () => {
  it.each([TIMED, DECIDING, 'SET1-S:T15', 'SET1X-S:T15P'])(
    'refuses a completed 0–0 consistently with the factory: %s',
    (format) => {
      const model = modelFor(format);
      const validation = scoreGovernor.validateSetScore(zero, format, false, false);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe(MESSAGE);
      expect(error(model)).toContain(MESSAGE);
      expect(isSettled(model, 0)).toBe(false);
      expect(isComplete(model)).toBe(false);
      expect(matchUpStatus(model)).toBeUndefined();
    }
  );

  it.each([
    [1, 0],
    [0, 1],
    [9, 9],
    [11, 8]
  ])('still completes scored timed results %i–%i', (a, b) => {
    const model = modelFor(TIMED, a, b);
    expect(error(model)).toBeUndefined();
    expect(isComplete(model)).toBe(true);
    expect(matchUpStatus(model)).toBe(COMPLETED);
  });

  it('does not treat a blank or half-entered score as 0–0', () => {
    const empty = createScoreEntryModel({ matchUpFormat: TIMED });
    const partial = setCell(empty, { setIndex: 0, side: 1, kind: 'games' }, 0);
    for (const model of [empty, partial]) {
      expect(error(model)).toBeUndefined();
      expect(isComplete(model)).toBe(false);
    }
  });

  it('keeps non-completed endings available and restores the refusal when unchosen', () => {
    const initial = modelFor();
    const retired = chooseEnding(initial, { kind: 'side', sideNumber: 2, status: RETIRED });
    const suspended = chooseEnding(initial, { kind: 'match', status: SUSPENDED });
    const walkover = chooseEnding(initial, { kind: 'side', sideNumber: 2, status: WALKOVER });
    for (const model of [retired, suspended, walkover]) {
      expect(error(model)).toBeUndefined();
      expect(isComplete(model)).toBe(false);
      expect(matchUpStatus(model)).not.toBe(COMPLETED);
    }
    expect(error(chooseEnding(retired, { kind: 'side', sideNumber: 2, status: RETIRED }))).toContain(MESSAGE);
  });

  it.each(['SET2XA-S:T15P', 'SET3X-S:T10', 'SET1XA-S:T15P'])('preserves scoreless periods in %s', (format) => {
    const model = modelFor(format);
    expect(isSettled(model, 0)).toBe(true);
    expect(error(model)).toBeUndefined();
  });

  it('still completes an aggregate with a scoreless period', () => {
    const model = createScoreEntryModel({
      matchUpFormat: 'SET2XA-S:T15P',
      sets: [zero, { setNumber: 2, side1Score: 1, side2Score: 0 }]
    });
    expect(error(model)).toBeUndefined();
    expect(isComplete(model)).toBe(true);
  });
});

/**
 * What Submit does with it. The dialog tests this replaced opened all three approaches on a seeded 0–0; the
 * rule is the model's and the same for every approach, so it is asked of the footer here. The dialog round
 * trip — the message in the band, a trusted click refused on the disabled Submit, then 0–1 submitted as
 * COMPLETED — is the `ScorelessTimedSet` story in `src/stories/scoreEntryDialog.stories.ts`.
 */
describe('the footer', () => {
  const view = (model: ScoreEntryModel) => ({ model });
  const gate = (model: ScoreEntryModel) =>
    clearGate({ openedOnRecordedOutcome: false, cleared: false, holdsEntry: holdsEntry(view(model)) });

  it('closes Submit on a seeded 0–0 and says why', () => {
    const seeded = modelFor();
    expect(footerState(view(seeded), gate(seeded)).submitDisabled).toBe(true);
    expect(scoreEntryError(view(seeded))).toContain(MESSAGE);
  });

  it('closes it on a typed 0–0, then submits COMPLETED to the side that scores', () => {
    const empty = createScoreEntryModel({ matchUpFormat: TIMED });
    const zeroZero = setCell(setCell(empty, G1, 0), G2, 0);
    expect(footerState(view(zeroZero), gate(zeroZero)).submitDisabled).toBe(true);

    const scored = setCell(zeroZero, G2, 1);
    expect(footerState(view(scored), gate(scored)).submitDisabled).toBe(false);
    expect(scoreEntryError(view(scored))).toBeUndefined();

    const outcome = submission(view(scored), gate(scored))!;
    expect(toEngineOutcome({ ...outcome, sets: enteredSets(scored) })).toMatchObject({
      matchUpStatus: COMPLETED,
      winningSide: 2
    });
  });
});
