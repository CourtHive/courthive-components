import { describe, it, expect } from 'vitest';
import { matchUpStatusConstants, nonDirectingMatchUpStatuses } from 'tods-competition-factory';
import {
  applyIrregularEndingToValidation,
  WINNER_REQUIRING_STATUSES,
  NON_DIRECTING_ENDINGS,
  resolveIrregularEnding,
  WINNER_REQUIRED_ERROR,
  SELECTABLE_ENDINGS,
  supportsNeitherSide,
  requiresWinner,
  NEITHER_SIDE,
} from '../irregularEnding';

const { COMPLETED, RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT, ABANDONED, CANCELLED, INCOMPLETE } =
  matchUpStatusConstants;

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

describe('the six selectable endings', () => {
  // These six are exactly the keys the factory's scoring policy refines with matchUpStatusCodes.
  // If that set ever diverges from what the modal offers, a code group becomes unreachable or a
  // status becomes unrefinable — so pin it.
  it('are the six matchUpStatusCodes policy keys', () => {
    expect([...SELECTABLE_ENDINGS].toSorted((a, b) => a.localeCompare(b, 'en'))).toEqual(
      [ABANDONED, CANCELLED, DEFAULTED, INCOMPLETE, RETIRED, WALKOVER].toSorted((a, b) => a.localeCompare(b, 'en')),
    );
  });

  it('split cleanly into winner-requiring and non-directing, with no overlap and nothing left over', () => {
    const winnerRequiring = SELECTABLE_ENDINGS.filter((s) => WINNER_REQUIRING_STATUSES.has(s));
    const nonDirecting = SELECTABLE_ENDINGS.filter((s) => NON_DIRECTING_ENDINGS.has(s));

    expect(winnerRequiring).toHaveLength(3);
    expect(nonDirecting).toHaveLength(3);
    expect(winnerRequiring.filter((s) => NON_DIRECTING_ENDINGS.has(s))).toEqual([]);
    expect(winnerRequiring.length + nonDirecting.length).toBe(SELECTABLE_ENDINGS.length);
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

