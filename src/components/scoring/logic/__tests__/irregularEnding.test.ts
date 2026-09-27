import { describe, it, expect } from 'vitest';
import { matchUpStatusConstants, nonDirectingMatchUpStatuses } from 'tods-competition-factory';
import {
  applyIrregularEndingToValidation,
  WINNER_REQUIRING_STATUSES,
  NON_DIRECTING_ENDINGS,
  resolveIrregularEnding,
  WINNER_REQUIRED_ERROR,
  SELECTABLE_ENDINGS,
  coexistsWithScore,
  supportsNeitherSide,
  carriesNoScore,
  endingLabels,
  requiresWinner,
  NEITHER_SIDE,
} from '../irregularEnding';

const {
  COMPLETED,
  RETIRED,
  WALKOVER,
  DEFAULTED,
  DOUBLE_WALKOVER,
  DOUBLE_DEFAULT,
  ABANDONED,
  CANCELLED,
  INCOMPLETE,
  SUSPENDED,
  DEAD_RUBBER,
  IN_PROGRESS,
  AWAITING_RESULT,
} = matchUpStatusConstants;

describe('resolveIrregularEnding', () => {
  describe('a named winner keeps the selected status', () => {
    it.each([
      [RETIRED, 1],
      [RETIRED, 2],
      [WALKOVER, 1],
      [WALKOVER, 2],
      [DEFAULTED, 1],
      [DEFAULTED, 2],
    ])('%s with side %i', (selectedOutcome, winnerSelection) => {
      const result = resolveIrregularEnding({ selectedOutcome, winnerSelection: winnerSelection as 1 | 2 });

      expect(result).toEqual({
        matchUpStatus: selectedOutcome,
        winningSide: winnerSelection,
        isValid: true,
        awaitingWinner: false,
        isDoubleExit: false,
      });
    });
  });

  describe('NEITHER_SIDE produces the double-exit status, with no winningSide', () => {
    it('walkover becomes a double walkover', () => {
      const result = resolveIrregularEnding({ selectedOutcome: WALKOVER, winnerSelection: NEITHER_SIDE });

      expect(result.matchUpStatus).toBe(DOUBLE_WALKOVER);
      expect(result.isDoubleExit).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.winningSide).toBeUndefined();
    });

    it('defaulted becomes a double default', () => {
      const result = resolveIrregularEnding({ selectedOutcome: DEFAULTED, winnerSelection: NEITHER_SIDE });

      expect(result.matchUpStatus).toBe(DOUBLE_DEFAULT);
      expect(result.isDoubleExit).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.winningSide).toBeUndefined();
    });

    // The factory ships no double-retirement status, so this answer has no resolution. It must fail
    // closed rather than inventing one — and the UI must not offer it in the first place.
    it('retired has no double form and stays unresolved', () => {
      const result = resolveIrregularEnding({ selectedOutcome: RETIRED, winnerSelection: NEITHER_SIDE });

      expect(result.isValid).toBe(false);
      expect(result.awaitingWinner).toBe(true);
      expect(result.isDoubleExit).toBe(false);
      expect(result.winningSide).toBeUndefined();
    });
  });

  // This is the behaviour change. Before, an unanswered winner question WAS the double-exit answer:
  // selecting Walkover alone returned a valid, submittable DOUBLE_WALKOVER.
  describe('an unanswered winner question is never valid', () => {
    it.each([RETIRED, WALKOVER, DEFAULTED])('%s with no winner selection', (selectedOutcome) => {
      const result = resolveIrregularEnding({ selectedOutcome, winnerSelection: undefined });

      expect(result.isValid).toBe(false);
      expect(result.awaitingWinner).toBe(true);
      expect(result.isDoubleExit).toBe(false);
      expect(result.winningSide).toBeUndefined();
    });

    it('carries the selected status through so a preview can still render it', () => {
      const result = resolveIrregularEnding({ selectedOutcome: WALKOVER, winnerSelection: undefined });

      expect(result.matchUpStatus).toBe(WALKOVER);
    });

    it('does NOT resolve to a double exit — the regression this replaces', () => {
      const result = resolveIrregularEnding({ selectedOutcome: WALKOVER, winnerSelection: undefined });

      expect(result.matchUpStatus).not.toBe(DOUBLE_WALKOVER);
      expect(result.isValid).not.toBe(true);
    });
  });

  describe('non-endings resolve inertly', () => {
    it.each([
      ['COMPLETED', COMPLETED],
      ['undefined', undefined],
    ])('%s', (_label, selectedOutcome) => {
      const result = resolveIrregularEnding({ selectedOutcome, winnerSelection: NEITHER_SIDE });

      expect(result).toEqual({ isValid: false, awaitingWinner: false, isDoubleExit: false });
    });
  });
});

describe('supportsNeitherSide', () => {
  it.each([
    [WALKOVER, true],
    [DEFAULTED, true],
    [RETIRED, false],
    [COMPLETED, false],
  ])('%s → %s', (selectedOutcome, expected) => {
    expect(supportsNeitherSide(selectedOutcome)).toBe(expected);
  });

  it('is false for undefined', () => {
    expect(supportsNeitherSide(undefined)).toBe(false);
  });
});

describe('WINNER_REQUIRING_STATUSES', () => {
  it('is exactly the three irregular endings that name a side', () => {
    expect([...WINNER_REQUIRING_STATUSES].toSorted((a, b) => a.localeCompare(b, 'en'))).toEqual(
      [RETIRED, WALKOVER, DEFAULTED].toSorted((a, b) => a.localeCompare(b, 'en')),
    );
  });
});

describe('applyIrregularEndingToValidation', () => {
  it('leaves a COMPLETED validation untouched', () => {
    const validation: any = { isValid: true, winningSide: 1, sets: [{ side1Score: 6, side2Score: 4 }] };

    applyIrregularEndingToValidation(validation, COMPLETED, undefined);

    expect(validation).toEqual({ isValid: true, winningSide: 1, sets: [{ side1Score: 6, side2Score: 4 }] });
  });

  it('clears the stale score error once the ending decides the outcome', () => {
    const validation: any = { isValid: false, sets: [], error: 'At least one set is required' };

    applyIrregularEndingToValidation(validation, WALKOVER, NEITHER_SIDE);

    expect(validation.matchUpStatus).toBe(DOUBLE_WALKOVER);
    expect(validation.isValid).toBe(true);
    expect(validation.error).toBeUndefined();
  });

  it('strips a winningSide the score validator inferred when the ending carries none', () => {
    const validation: any = { isValid: true, winningSide: 2, sets: [] };

    applyIrregularEndingToValidation(validation, DEFAULTED, NEITHER_SIDE);

    expect(validation.matchUpStatus).toBe(DOUBLE_DEFAULT);
    expect('winningSide' in validation).toBe(false);
  });

  it('marks an unanswered winner question invalid and says why', () => {
    const validation: any = { isValid: true, winningSide: 1, sets: [] };

    applyIrregularEndingToValidation(validation, WALKOVER, undefined);

    expect(validation.isValid).toBe(false);
    expect(validation.error).toBe(WINNER_REQUIRED_ERROR);
    expect('winningSide' in validation).toBe(false);
  });

  it('returns the resolution so callers can render the double-exit warning', () => {
    const validation: any = { isValid: false, sets: [] };

    const resolution = applyIrregularEndingToValidation(validation, WALKOVER, NEITHER_SIDE);

    expect(resolution.isDoubleExit).toBe(true);
  });
});

describe('the ten selectable endings', () => {
  // The vocabulary every set-entry approach offers. It held SIX on the reasoning that those are
  // exactly the keys the factory's scoring policy refines with matchUpStatusCodes — true, but the
  // wrong list to derive a vocabulary from: `freeScoreApproach` has always PARSED ten, so four
  // statuses were typeable in one approach and unreachable in the other three.
  //
  // Pinned as a literal, deliberately. Everything downstream is derived from this constant, so a
  // derived assertion here would be vacuous — this is the one place a literal earns its keep,
  // because the list is a decision (CA, 2026-09-27) rather than a computation.
  it('are the ten the approaches agree on', () => {
    expect([...SELECTABLE_ENDINGS].toSorted((a, b) => a.localeCompare(b, 'en'))).toEqual(
      [
        ABANDONED,
        AWAITING_RESULT,
        CANCELLED,
        DEAD_RUBBER,
        DEFAULTED,
        INCOMPLETE,
        IN_PROGRESS,
        RETIRED,
        SUSPENDED,
        WALKOVER,
      ].toSorted((a, b) => a.localeCompare(b, 'en')),
    );
  });

  it('split cleanly into winner-requiring and non-directing, with no overlap and nothing left over', () => {
    // The partition is what makes the design's "3 on the player rows, 7 in the match-level group"
    // split legitimate rather than a layout choice. Both sets are derived from the factory's own
    // classification INDEPENDENTLY — not as each other's complement — so a status the factory puts in
    // neither, or in both, fails here instead of being silently swept into one.
    const winnerRequiring = SELECTABLE_ENDINGS.filter((s) => WINNER_REQUIRING_STATUSES.has(s));
    const nonDirecting = SELECTABLE_ENDINGS.filter((s) => NON_DIRECTING_ENDINGS.has(s));

    expect(winnerRequiring).toHaveLength(3);
    expect(nonDirecting).toHaveLength(7);
    expect(winnerRequiring.filter((s) => NON_DIRECTING_ENDINGS.has(s))).toEqual([]);
    expect(winnerRequiring.length + nonDirecting.length).toBe(SELECTABLE_ENDINGS.length);
  });

  it('every ending is labelled, and no label falls through to the raw constant', () => {
    // `endingLabels()` is shared because it was not: each approach kept a partial map, and Dynamic
    // Sets read it with NO fallback — so widening the vocabulary without hoisting it would have
    // rendered four radios labelled `undefined`.
    const labelled = endingLabels();

    for (const status of SELECTABLE_ENDINGS) {
      expect(labelled[status], `${status} has no label`).toBeTruthy();
      expect(labelled[status], `${status} fell through to its raw constant`).not.toBe(status);
    }
  });

  it('honours a locale override, and falls back per-status rather than all-or-nothing', () => {
    const labelled = endingLabels({ suspended: 'Suspendu' });

    expect(labelled[SUSPENDED]).toBe('Suspendu');
    expect(labelled[RETIRED]).toBe('Retired');
  });

  // ── Which endings coexist with a partial score ──
  //
  // Two different questions that coincided across the old six and diverge across the ten: "does
  // anyone advance out of this" (non-directing) and "is there a score at all" (no-score). The Dial
  // Pad's digit gate asked the first where it meant the second.
  it('separates "resolves nobody" from "carries no score" — the two are not the same question', () => {
    // The cases that make the distinction real. CANCELLED and DEAD_RUBBER are non-directing AND
    // carry no score; SUSPENDED is non-directing and its partial score is the whole point.
    expect(NON_DIRECTING_ENDINGS.has(CANCELLED)).toBe(true);
    expect(carriesNoScore(CANCELLED)).toBe(true);
    expect(coexistsWithScore(CANCELLED)).toBe(false);

    expect(NON_DIRECTING_ENDINGS.has(DEAD_RUBBER)).toBe(true);
    expect(carriesNoScore(DEAD_RUBBER)).toBe(true);
    expect(coexistsWithScore(DEAD_RUBBER)).toBe(false);

    expect(NON_DIRECTING_ENDINGS.has(SUSPENDED)).toBe(true);
    expect(carriesNoScore(SUSPENDED)).toBe(false);
    expect(coexistsWithScore(SUSPENDED)).toBe(true);
  });

  it('keeps a partial score for the endings whose meaning includes one', () => {
    // "6-4 3-2, abandoned" — the score is what says when it was abandoned. RETIRED and DEFAULTED are
    // excluded because typing a digit clears them by the pre-existing contract (starting over), even
    // though a retirement does keep whatever was played once submitted.
    for (const status of [ABANDONED, INCOMPLETE, SUSPENDED, IN_PROGRESS, AWAITING_RESULT]) {
      expect(coexistsWithScore(status), `${status} should survive a typed score`).toBe(true);
    }
  });

  it('never lets a winner-requiring ending coexist with a typed score', () => {
    for (const status of WINNER_REQUIRING_STATUSES) {
      expect(coexistsWithScore(status), `${status} must be cleared when a digit is typed`).toBe(false);
    }
  });

  it('agrees with the factory about which statuses carry no score, and says where it does not', () => {
    // The factory blanks scores for the walkovers only (`modifyMatchUpScore.ts:236`). CANCELLED and
    // DEAD_RUBBER are a deliberately WIDER client policy (CA, 2026-09-27) — the client never submits
    // a score for them. Asserted so the divergence is intentional and documented rather than found.
    expect(carriesNoScore(WALKOVER)).toBe(true);
    expect(carriesNoScore(DOUBLE_WALKOVER)).toBe(true);

    // Not the factory's, and must stay that way: a default or retirement mid-match keeps what was
    // played, and the factory agrees by omitting them.
    expect(carriesNoScore(DEFAULTED)).toBe(false);
    expect(carriesNoScore(RETIRED)).toBe(false);
    expect(carriesNoScore(ABANDONED)).toBe(false);
  });

  // Authority cross-check: our "resolves nobody" classification must agree with the factory's own,
  // so a reclassification upstream fails here rather than silently changing what the modal submits.
  it('agrees with the factory that the non-directing endings direct nobody', () => {
    for (const status of NON_DIRECTING_ENDINGS) {
      expect(nonDirectingMatchUpStatuses).toContain(status);
    }
  });

  it('agrees with the factory that the winner-requiring endings are NOT non-directing', () => {
    for (const status of WINNER_REQUIRING_STATUSES) {
      expect(nonDirectingMatchUpStatuses).not.toContain(status);
    }
  });
});

describe('an ending that resolves nobody needs no winner', () => {
  it.each([ABANDONED, CANCELLED, INCOMPLETE])('%s is valid as soon as it is chosen', (status) => {
    const result = resolveIrregularEnding({ selectedOutcome: status, winnerSelection: undefined });

    expect(result.isValid).toBe(true);
    expect(result.awaitingWinner).toBe(false);
    expect(result.matchUpStatus).toBe(status);
    expect(result.winningSide).toBeUndefined();
  });

  it.each([ABANDONED, CANCELLED, INCOMPLETE])('%s ignores a winner selection rather than honouring it', (status) => {
    const result = resolveIrregularEnding({ selectedOutcome: status, winnerSelection: 1 });

    expect(result.winningSide).toBeUndefined();
    expect(result.isValid).toBe(true);
  });

  it.each([ABANDONED, CANCELLED, INCOMPLETE])('%s is never a double exit', (status) => {
    const result = resolveIrregularEnding({ selectedOutcome: status, winnerSelection: NEITHER_SIDE });

    expect(result.isDoubleExit).toBe(false);
    expect(result.matchUpStatus).toBe(status);
  });

  it('clears a stale validator error when applied', () => {
    const validation: any = { isValid: false, sets: [], error: 'Incomplete match - need 2 sets to win' };

    applyIrregularEndingToValidation(validation, ABANDONED, undefined);

    expect(validation.isValid).toBe(true);
    expect(validation.error).toBeUndefined();
  });
});

describe('requiresWinner', () => {
  it.each([
    [RETIRED, true],
    [WALKOVER, true],
    [DEFAULTED, true],
    [ABANDONED, false],
    [CANCELLED, false],
    [INCOMPLETE, false],
    [COMPLETED, false],
  ])('%s → %s', (status, expected) => {
    expect(requiresWinner(status)).toBe(expected);
  });

  it('is false for undefined', () => {
    expect(requiresWinner(undefined)).toBe(false);
  });
});

