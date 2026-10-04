/**
 * Tests for aggregate scoring with conditional final tiebreak
 * Format: SET3XA-S:T10-F:TB1 and SET4XA-S:T10-F:TB1
 */

import { describe, it, expect } from 'vitest';
import { parseScore } from '../freeScore';

const FORMAT_SET3XA_TB1 = 'SET3XA-S:T10-F:TB1';
const SCORE_30_25_20_30 = '30-25 20-30';
const SCORE_30_25_20_30_20_20 = '30-25 20-30 20-20';

describe('freeScore - Aggregate Scoring with Conditional TB', () => {
  describe('SET3XA-S:T10 (3 sets, aggregate, no conditional TB)', () => {
    const format = 'SET3XA-S:T10';

    it('should accept 3 sets with highly uneven scores (30-0, 0-1, 0-1)', () => {
      const result = parseScore('30-0 0-1 0-1', format);

      // Aggregate: 30-2, side 1 wins decisively
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(3);
      expect(result.matchComplete).toBe(true);
      expect(result.formattedScore).toBe('30-0 0-1 0-1');

      // Verify set details (timed aggregate sets don't set winningSide per set)
      expect(result.sets[0].side1Score).toBe(30);
      expect(result.sets[0].side2Score).toBe(0);

      expect(result.sets[1].side1Score).toBe(0);
      expect(result.sets[1].side2Score).toBe(1);

      expect(result.sets[2].side1Score).toBe(0);
      expect(result.sets[2].side2Score).toBe(1);
    });

    it('should calculate MATCH winningSide correctly for 30-1, 0-1, 0-1 aggregate', async () => {
      const result = parseScore('30-1 0-1 0-1', format);

      // Aggregate: 30-3, side 1 wins
      // Sets won: 1-2, side 2 wins
      // Winner should be side 1 (aggregate)
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(3);

      // Now test with determineWinningSide
      const { determineWinningSide } = await import('../../../components/scoring/utils/setExpansionLogic');
      const matchWinningSide = determineWinningSide(result.sets, format);

      expect(matchWinningSide).toBe(1); // Should be side 1 based on aggregate (30 > 3)
    });

    it('should require all 3 sets even when one side dominates aggregate (no conditional TB)', () => {
      const result = parseScore('50-0 0-1', format);

      // Incomplete - need all 3 sets for exactly format without conditional TB
      expect(result.valid).toBe(false);
      expect(result.incomplete).toBe(true);
      expect(result.sets.length).toBe(2);
      expect(result.matchComplete).toBe(false);
    });

    it('should calculate aggregate correctly with balanced scores', () => {
      const result = parseScore('10-11 11-10 22-21', format);

      // Aggregate: 43-42, side 1 wins by 1 point
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(3);
      expect(result.matchComplete).toBe(true);
    });
  });

  // All N timed sets are always played; the TB1 decider is set N + 1, only on a level total. It is
  // never one of the N (factory #5166; CA, 2026-10-04: "In the INTENNSE competition format that is
  // not to be considered one of the N sets").
  describe('SET3XA-S:T10-F:TB1 (3 sets, aggregate, conditional TB1 as set 4)', () => {
    const format = FORMAT_SET3XA_TB1;

    it('should accept 3 sets when aggregate not tied (side 2 wins)', () => {
      const result = parseScore(SCORE_30_25_20_30_20_20, format);

      // Aggregate: 70-75, side 2 wins, no TB needed
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(3);
      expect(result.matchComplete).toBe(true);
      expect(result.formattedScore).toBe(SCORE_30_25_20_30_20_20);
    });

    it('should accept 3 sets when aggregate not tied (side 1 wins)', () => {
      const result = parseScore('30-25 45-55 30-20', format);

      // Aggregate: 105-100, side 1 wins
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(3);
      expect(result.matchComplete).toBe(true);
    });

    it('should NOT complete after 2 sets even when aggregate not tied (bolt 3 is always played)', () => {
      const result = parseScore(SCORE_30_25_20_30, format);

      expect(result.valid).toBe(false);
      expect(result.incomplete).toBe(true);
      expect(result.matchComplete).toBe(false);
    });

    it('should accept the set 4 TB when the 3 bolts are level', () => {
      const result = parseScore('30-25 25-30 20-20 1-0', format);

      // Aggregate: 75-75, TB decides
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(4);
      expect(result.matchComplete).toBe(true);
      expect(result.sets[3].side1TiebreakScore).toBe(1);
      expect(result.sets[3].side2TiebreakScore).toBe(0);
    });

    it('should accept the set 4 TB score 0-1', () => {
      const result = parseScore('30-25 25-30 20-20 0-1', format);

      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(4);
      expect(result.sets[3].side1TiebreakScore).toBe(0);
      expect(result.sets[3].side2TiebreakScore).toBe(1);
    });

    it('should read a 1-0 in bolt 3 as a timed bolt, never as the decider', () => {
      const result = parseScore('30-25 25-30 1-0', format);

      // Aggregate: 56-55, bolt 3 decides it on points
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(3);
      expect(result.sets[2].side1Score).toBe(1);
      expect(result.sets[2].side1TiebreakScore).toBeUndefined();
    });

    it('should reject 3 level bolts (missing TB)', () => {
      const result = parseScore('30-25 25-30 20-20', format);

      // Aggregate: 75-75, TB required
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Aggregate tied');
      expect(result.errors[0].message).toContain('TB required');
    });

    it('should reject a set 4 TB when aggregate not tied (TB not allowed)', () => {
      const result = parseScore('30-25 20-30 20-20 1-0', format);

      // Aggregate: 70-75, side 2 wins, TB not allowed
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('not tied');
      expect(result.errors[0].message).toContain('not allowed');
    });

    it('should reject invalid TB scores (2-0)', () => {
      const result = parseScore('30-25 25-30 20-20 2-0', format);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('TB1 only accepts "1-0" or "0-1"');
    });

    it('should reject invalid TB scores (7-5)', () => {
      const result = parseScore('30-25 25-30 20-20 7-5', format);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('TB1 only accepts');
    });

    it('should reject 5 sets (too many)', () => {
      const result = parseScore('30-25 25-30 20-20 1-0 1-0', format);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toMatch(/Too many|extra sets/i);
    });

    it('should mark as incomplete with only 1 set', () => {
      const result = parseScore('30-25', format);

      expect(result.valid).toBe(false);
      expect(result.incomplete).toBe(true);
      expect(result.matchComplete).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('SET4XA-S:T10-F:TB1 (4 sets, aggregate, conditional TB1 as set 5)', () => {
    const format = 'SET4XA-S:T10-F:TB1';

    it('should accept 4 sets when aggregate not tied', () => {
      const result = parseScore('30-25 20-30 45-50 10-10', format);

      // Aggregate: 105-115, side 2 wins
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(4);
      expect(result.matchComplete).toBe(true);
    });

    it('should accept the set 5 TB when the 4 bolts are level', () => {
      const result = parseScore('30-25 20-30 30-30 1-0', format);
      // A 1-0 in bolt 4 is a timed bolt: aggregate 81-85, side 2 wins
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(4);
      expect(result.sets[3].side1TiebreakScore).toBeUndefined();

      // 30-30, 20-20, 25-25, 10-10 → 85-85, so the decider is set 5
      const result2 = parseScore('30-30 20-20 25-25 10-10 1-0', format);

      expect(result2.valid).toBe(true);
      expect(result2.sets.length).toBe(5);
      expect(result2.matchComplete).toBe(true);
      expect(result2.sets[4].side1TiebreakScore).toBe(1);
    });

    it('should reject 4 level bolts (missing TB)', () => {
      const result = parseScore('30-30 20-20 25-25 10-10', format);

      // Aggregate: 85-85, TB required
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Aggregate tied');
    });

    it('should reject a set 5 TB when aggregate not tied (TB not allowed)', () => {
      const result = parseScore('30-25 20-30 30-20 10-10 1-0', format);

      // Aggregate: 90-85, TB not allowed
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('not tied');
    });

    it('should mark as incomplete with only 3 sets', () => {
      const result = parseScore('30-25 20-30 45-50', format);

      expect(result.valid).toBe(false);
      expect(result.incomplete).toBe(true);
      expect(result.matchComplete).toBe(false);
    });
  });

  describe('SET3XA-S:T10-F:TB1NOAD (NoAD final TB)', () => {
    const format = 'SET3XA-S:T10-F:TB1NOAD';

    it('should accept TB with NoAD format (same validation as TB1)', () => {
      const result = parseScore('30-25 25-30 20-20 1-0', format);

      expect(result.valid).toBe(true);
      expect(result.sets[3].side1TiebreakScore).toBe(1);
    });

    it('should reject invalid TB scores for NoAD', () => {
      const result = parseScore('30-25 25-30 20-20 2-1', format);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('TB1 only accepts');
    });
  });

  describe('Edge Cases', () => {
    const format = FORMAT_SET3XA_TB1;

    it('should handle zero-scored bolts', () => {
      const result = parseScore('0-0 0-1 0-0', format);

      // Aggregate: 0-1, side 2 wins
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(3);
    });

    it('should handle high aggregate scores', () => {
      const result = parseScore('100-50 50-100 20-20 1-0', format);

      // Aggregate: 170-170, TB decides
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(4);
    });

    it('should handle one-sided match (50-0 0-40 0-0)', () => {
      const result = parseScore('50-0 0-40 0-0', format);

      // Aggregate: 50-40, side 1 wins
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(3);
      expect(result.matchComplete).toBe(true);
    });
  });

  describe('Regular timed sets (no aggregate)', () => {
    it('should still work for SET3X-S:T10 (no aggregate)', () => {
      const format = 'SET3X-S:T10';
      const result = parseScore('30-25 20-30 35-30', format);

      // Regular timed, all 3 sets required
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(3);
    });

    it('should reject 2 sets for SET3X-S:T10 (no conditional logic)', () => {
      const format = 'SET3X-S:T10';
      const result = parseScore(SCORE_30_25_20_30, format);

      // Not aggregate, so all 3 sets required
      expect(result.valid).toBe(false);
      expect(result.incomplete).toBe(true);
    });
  });

  describe('Realistic score examples', () => {
    it('should accept 10-11 11-10 10-10 1-0 for SET3XA-S:T10-F:TB1', () => {
      const result = parseScore('10-11 11-10 10-10 1-0', FORMAT_SET3XA_TB1);

      // Aggregate: 31-31, tied → TB decides
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(4);
      expect(result.matchComplete).toBe(true);
    });

    it('should accept 10-11 11-11 11-10 9-9 1-0 for SET4XA-S:T10-F:TB1', () => {
      const result = parseScore('10-11 11-11 11-10 9-9 1-0', 'SET4XA-S:T10-F:TB1');

      // Aggregate: 41-41, tied → TB decides
      expect(result.valid).toBe(true);
      expect(result.sets.length).toBe(5);
      expect(result.matchComplete).toBe(true);
      expect(result.sets[4].side1TiebreakScore).toBe(1);
      expect(result.sets[4].side2TiebreakScore).toBe(0);
    });
  });
});
