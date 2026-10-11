import { describe, expect, it } from 'vitest';

import {
  autoAdjustTiebreakAt,
  getBestOfOptionsForRoot,
  getTiebreakAtOptions,
  MATCH_ROOT_LABELS,
  MATCH_ROOTS
} from '../machine/options';

/**
 * The picker's option helpers, moved with their tests from the retired `matchUpFormatLogic.ts` and
 * `matchUpFormatLogic.test.ts`. The assertions are unchanged.
 */
describe("the picker's option helpers", () => {
  describe('getTiebreakAtOptions', () => {
    it('should return correct options for setTo=6', () => {
      expect(getTiebreakAtOptions(6)).toEqual([5, 6]);
    });

    it('should return correct options for setTo=4', () => {
      expect(getTiebreakAtOptions(4)).toEqual([3, 4]);
    });

    it('should return correct options for setTo=8', () => {
      expect(getTiebreakAtOptions(8)).toEqual([7, 8]);
    });

    it('should return empty array for setTo=1', () => {
      expect(getTiebreakAtOptions(1)).toEqual([]);
    });

    it('should return empty array for setTo=0', () => {
      expect(getTiebreakAtOptions(0)).toEqual([]);
    });
  });

  describe('autoAdjustTiebreakAt', () => {
    it('should keep current value if still valid', () => {
      expect(autoAdjustTiebreakAt(6, 6)).toBe(6);
      expect(autoAdjustTiebreakAt(6, 5)).toBe(5);
    });

    it('should adjust to setTo when current value is invalid', () => {
      expect(autoAdjustTiebreakAt(4, 6)).toBe(4);
      expect(autoAdjustTiebreakAt(8, 6)).toBe(8);
    });

    it('should handle edge cases', () => {
      expect(autoAdjustTiebreakAt(4, 3)).toBe(3);
      expect(autoAdjustTiebreakAt(4, 5)).toBe(4);
    });
  });

  describe('MATCH_ROOTS and helpers', () => {
    it('should have all expected match roots', () => {
      expect(MATCH_ROOTS).toContain('SET');
      expect(MATCH_ROOTS).toContain('HAL');
      expect(MATCH_ROOTS).toContain('QTR');
      expect(MATCH_ROOTS).toContain('PER');
      expect(MATCH_ROOTS).toContain('RND');
      expect(MATCH_ROOTS).toContain('FRM');
      expect(MATCH_ROOTS).toContain('MAP');
    });

    it('should have labels for all roots', () => {
      for (const root of MATCH_ROOTS) {
        expect(MATCH_ROOT_LABELS[root]).toBeDefined();
      }
    });

    it('getBestOfOptionsForRoot returns [1,3,5,7,9] for SET', () => {
      expect(getBestOfOptionsForRoot('SET')).toEqual([1, 3, 5, 7, 9]);
      expect(getBestOfOptionsForRoot(undefined)).toEqual([1, 3, 5, 7, 9]);
    });

    it('getBestOfOptionsForRoot returns [1..12] for non-SET', () => {
      const opts = getBestOfOptionsForRoot('HAL');
      expect(opts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });
});
