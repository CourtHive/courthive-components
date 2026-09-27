/**
 * What survives an approach switch, and — the part that matters — what must not.
 *
 * Rotating between Dynamic Sets, Dial Pad and Free Score used to discard the entry: the modal nulled
 * the outcome and handed the next approach the original saved matchUp. The fix is a projection, so
 * these tests are the contract for it.
 *
 * The dangerous case is not "the score is lost" — that fails loudly and a director notices. It is
 * `winningSide` coming back from the STORED matchUp after the operator has cleared the score, which
 * would put back a winner they removed, silently, at the moment they were changing their mind. That
 * is the fail-open shape one field over from the one `irregularEnding.ts` was written to kill, and
 * it gets its own named test.
 */
import { projectOutcomeOntoMatchUp } from '../outcomeProjection';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { describe, it, expect } from 'vitest';

import type { ScoreOutcome } from '../../types';

const { COMPLETED, WALKOVER, RETIRED } = matchUpStatusConstants;

const savedMatchUp = () => ({
  matchUpId: 'm1',
  drawId: 'd1',
  matchUpFormat: 'SET3-S:6/TB7',
  matchUpStatus: COMPLETED,
  winningSide: 1,
  score: { sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }], scoreStringSide1: '6-4' },
  sides: [{ sideNumber: 1 }, { sideNumber: 2 }]
});

const outcome = (over: Partial<ScoreOutcome> = {}): ScoreOutcome => ({ isValid: true, sets: [], ...over });

describe('projectOutcomeOntoMatchUp — nothing in progress', () => {
  it('returns the saved matchUp untouched when no outcome has been reported', () => {
    const saved = savedMatchUp();
    expect(projectOutcomeOntoMatchUp(saved, undefined)).toBe(saved);
    expect(projectOutcomeOntoMatchUp(saved, null)).toBe(saved);
  });

  it('returns it untouched for an outcome that asserts nothing', () => {
    // An approach reporting an empty frame is not saying "this match has no score" — it is not
    // speaking about the score at all. First-open behaviour must be exactly as it was.
    const saved = savedMatchUp();
    expect(projectOutcomeOntoMatchUp(saved, outcome({ isValid: false }))).toBe(saved);
  });
});

describe('projectOutcomeOntoMatchUp — carrying the entry across', () => {
  it('carries the in-progress score, so rotating does not discard what was typed', () => {
    const typed = { sets: [{ setNumber: 1, side1Score: 6, side2Score: 2, winningSide: 1 }], scoreStringSide1: '6-2' };
    const projected = projectOutcomeOntoMatchUp(savedMatchUp(), outcome({ scoreObject: typed, winningSide: 1 }));

    // Every approach hydrates from `matchUp.score`, so this is the whole mechanism.
    expect(projected.score).toEqual(typed);
    expect(projected.winningSide).toBe(1);
  });

  it('carries an irregular ending chosen before the switch', () => {
    const projected = projectOutcomeOntoMatchUp(savedMatchUp(), outcome({ matchUpStatus: WALKOVER, winningSide: 2 }));
    expect(projected.matchUpStatus).toBe(WALKOVER);
    expect(projected.winningSide).toBe(2);
  });

  it('keeps every other field of the matchUp', () => {
    const projected = projectOutcomeOntoMatchUp(savedMatchUp(), outcome({ matchUpStatus: RETIRED, winningSide: 1 }));
    expect(projected.matchUpId).toBe('m1');
    expect(projected.drawId).toBe('d1');
    expect(projected.matchUpFormat).toBe('SET3-S:6/TB7');
    expect(projected.sides).toHaveLength(2);
  });

  it('does not mutate the matchUp it was given', () => {
    // The modal holds one `matchUp` for the dialog's whole life and projects from it on every
    // switch. A mutating projection would make the second rotation read the first one's result.
    const saved = savedMatchUp();
    projectOutcomeOntoMatchUp(saved, outcome({ matchUpStatus: WALKOVER, winningSide: 2 }));
    expect(saved.matchUpStatus).toBe(COMPLETED);
    expect(saved.winningSide).toBe(1);
  });
});

describe('projectOutcomeOntoMatchUp — the winner must not come back from the record', () => {
  it('clears a stored winner when the in-progress outcome names none', () => {
    // THE test. The operator cleared the score; the outcome carries no winner. Falling back to the
    // saved `winningSide: 1` would put back a winner they had just removed — silently, at the exact
    // moment they were changing their mind.
    const projected = projectOutcomeOntoMatchUp(savedMatchUp(), outcome({ isValid: false, scoreObject: { sets: [] } }));
    expect(projected.winningSide).toBeUndefined();
    expect(savedMatchUp().winningSide).toBe(1);
  });

  it('clears it for a double exit, which names nobody by design', () => {
    // A double walkover advances neither side and carries no winningSide. Rotating must not hand the
    // next approach a winner the status forbids.
    const projected = projectOutcomeOntoMatchUp(
      savedMatchUp(),
      outcome({ matchUpStatus: 'DOUBLE_WALKOVER', winningSide: undefined })
    );
    expect(projected.matchUpStatus).toBe('DOUBLE_WALKOVER');
    expect(projected.winningSide).toBeUndefined();
  });

  it('score and status DO fall back — only the winner is unforgiving', () => {
    // The asymmetry is deliberate, so state it. An outcome that names a winner but no score is not
    // claiming the match has no score; the saved one stands.
    const saved = savedMatchUp();
    const projected = projectOutcomeOntoMatchUp(saved, outcome({ winningSide: 2 }));
    expect(projected.score).toEqual(saved.score);
    expect(projected.matchUpStatus).toBe(COMPLETED);
    expect(projected.winningSide).toBe(2);
  });
});
