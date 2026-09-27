/**
 * The inverse of `resolveIrregularEnding`, and the round trip the two of them have to close.
 *
 * `resolveIrregularEnding` was hoisted into shared logic because three approaches each carried their
 * own copy of the forward rule and disagreed — producing a fail-open `DOUBLE_WALKOVER` where an
 * unanswered question was read as a particular answer (Mentat architectural standard A3). The
 * inverse was left in each approach and diverged the same way, measured before this module existed:
 * `dialPadApproach` restored three of the six endings, and `inlineScoringApproach` discarded a saved
 * result outright.
 *
 * So the assertions here are of two kinds. The direct ones pin what `hydrateIrregularEnding` returns
 * for each shape a stored status legitimately takes. The round-trip table is the one that would have
 * caught the divergence: for EVERY status in `SELECTABLE_ENDINGS`, resolving what hydration produced
 * must give back the status it was saved with. A table rather than six hand-written cases, so a
 * seventh ending added to the vocabulary is covered the day it is added rather than the day someone
 * remembers.
 */
import {
  applyIrregularEndingToValidation,
  hydrateIrregularEnding,
  resolveIrregularEnding,
  SELECTABLE_ENDINGS,
  NON_DIRECTING_ENDINGS,
  DOUBLE_EXIT_STATUSES,
  requiresWinner,
  NEITHER_SIDE
} from '../irregularEnding';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { describe, it, expect } from 'vitest';

const { COMPLETED, RETIRED, WALKOVER, DEFAULTED, ABANDONED, CANCELLED, INCOMPLETE, DOUBLE_WALKOVER, DOUBLE_DEFAULT } =
  matchUpStatusConstants;

describe('hydrateIrregularEnding — a stored status becomes a control selection', () => {
  it('reads an ending that names a side, with its winner', () => {
    expect(hydrateIrregularEnding({ matchUpStatus: RETIRED, winningSide: 2 })).toEqual({
      selectedOutcome: RETIRED,
      winnerSelection: 2
    });
  });

  it('recovers NEITHER_SIDE from a double exit rather than guessing it', () => {
    // The stored form carries no winningSide at all, so the third value of the tri-state has to come
    // back from the STATUS. Guessing it would be the fail-open shape this module exists to prevent.
    expect(hydrateIrregularEnding({ matchUpStatus: DOUBLE_WALKOVER })).toEqual({
      selectedOutcome: WALKOVER,
      winnerSelection: NEITHER_SIDE
    });
    expect(hydrateIrregularEnding({ matchUpStatus: DOUBLE_DEFAULT })).toEqual({
      selectedOutcome: DEFAULTED,
      winnerSelection: NEITHER_SIDE
    });
  });

  it.each([ABANDONED, CANCELLED, INCOMPLETE])('restores %s with no winner — the Dial Pad gap', (status) => {
    // These three are exactly what `dialPadApproach` did not restore: a saved ABANDONED re-opened
    // reading as COMPLETED, and re-submitting silently replaced a non-directing status.
    expect(NON_DIRECTING_ENDINGS.has(status)).toBe(true);
    expect(hydrateIrregularEnding({ matchUpStatus: status })).toEqual({
      selectedOutcome: status,
      winnerSelection: undefined
    });
  });

  it('never reads a winner onto a non-directing ending, even if one is stored', () => {
    // An abandoned match resolves nobody. A stray winningSide on the record must not become a
    // selection the operator never made.
    expect(hydrateIrregularEnding({ matchUpStatus: ABANDONED, winningSide: 1 })).toEqual({
      selectedOutcome: ABANDONED,
      winnerSelection: undefined
    });
  });

  it('keeps an unanswered winner unanswered', () => {
    // The fail-closed state has to survive a save/reopen cycle. Defaulting to side 1 here would
    // make an unanswered question look answered — the original bug, one level down.
    expect(hydrateIrregularEnding({ matchUpStatus: WALKOVER })).toEqual({
      selectedOutcome: WALKOVER,
      winnerSelection: undefined
    });
    expect(requiresWinner(WALKOVER)).toBe(true);
  });

  it.each([
    ['no matchUp at all', undefined],
    ['a completed match', { matchUpStatus: COMPLETED, winningSide: 1 }],
    ['a match not yet played', { matchUpStatus: 'TO_BE_PLAYED' }],
    ['a status this vocabulary does not offer', { matchUpStatus: 'DEAD_RUBBER' }],
    ['a status with no matchUpStatus key', {}]
  ])('inverts %s to the inert state', (_label, input) => {
    expect(hydrateIrregularEnding(input as any)).toEqual({ selectedOutcome: COMPLETED, winnerSelection: undefined });
  });
});

describe('the round trip closes for every ending in the vocabulary', () => {
  /** Every status a saved matchUp can legitimately carry out of this module, with its stored winner. */
  const saved: { status: string; winningSide?: number }[] = [
    ...SELECTABLE_ENDINGS.filter((s) => requiresWinner(s)).map((status) => ({ status, winningSide: 1 })),
    ...SELECTABLE_ENDINGS.filter((s) => !requiresWinner(s)).map((status) => ({ status })),
    ...[...DOUBLE_EXIT_STATUSES].map((status) => ({ status }))
  ];

  it.each(saved)('$status survives save → reopen → save', ({ status, winningSide }) => {
    const { selectedOutcome, winnerSelection } = hydrateIrregularEnding({ matchUpStatus: status, winningSide });
    const resolution = resolveIrregularEnding({ selectedOutcome, winnerSelection });

    expect(resolution.matchUpStatus).toBe(status);
    expect(resolution.winningSide).toBe(winningSide);
    expect(resolution.isValid).toBe(true);
    // Reopening a recorded result must never present as "you still owe me an answer".
    expect(resolution.awaitingWinner).toBe(false);
  });

  it('covers every selectable ending and both double exits — the table is not short', () => {
    // Guards the table itself: a seventh ending added to SELECTABLE_ENDINGS must widen this suite,
    // not slip past it. Without this, `saved` could silently go empty and every case above vacuously
    // pass.
    expect(saved.length).toBe(SELECTABLE_ENDINGS.length + DOUBLE_EXIT_STATUSES.size);
    expect(saved.length).toBeGreaterThanOrEqual(8);
  });

  it('a re-opened double exit still carries no winningSide through validation', () => {
    // The end-to-end shape: hydrate, then run the resolution through the validation applier the
    // approaches actually call. `winningSide` must be absent, not present-and-undefined, because the
    // factory reads the key's presence.
    const { selectedOutcome, winnerSelection } = hydrateIrregularEnding({ matchUpStatus: DOUBLE_WALKOVER });
    const validation: any = { isValid: true, winningSide: 1, sets: [] };
    applyIrregularEndingToValidation(validation, selectedOutcome, winnerSelection);

    expect(validation.matchUpStatus).toBe(DOUBLE_WALKOVER);
    expect('winningSide' in validation).toBe(false);
    expect(validation.isValid).toBe(true);
  });
});
