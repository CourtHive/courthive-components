import { describe, it, expect } from 'vitest';
import { matchUpStatusConstants } from 'tods-competition-factory';
import {
  applyIrregularEndingToValidation,
  WINNER_REQUIRING_STATUSES,
  resolveIrregularEnding,
  WINNER_REQUIRED_ERROR,
  supportsNeitherSide,
  NEITHER_SIDE,
} from '../irregularEnding';

const { COMPLETED, RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT } = matchUpStatusConstants;

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
