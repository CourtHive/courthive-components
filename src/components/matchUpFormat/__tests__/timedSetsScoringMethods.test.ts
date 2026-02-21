import { describe, it, expect } from 'vitest';
import { initializeFormatFromString, buildSetFormat, TIMED_SETS, SETS } from '../matchUpFormatLogic';
import { matchUpFormatCode } from 'tods-competition-factory';

describe('Timed Sets Scoring Methods (factory v2.4.2+)', () => {
  describe('Points-based scoring (T10P)', () => {
    it('should parse SET3X-S:T10P format', () => {
      const parsed = initializeFormatFromString('SET3X-S:T10P', matchUpFormatCode.parse);

      expect(parsed.setFormat.what).toBe(TIMED_SETS);
      expect(parsed.setFormat.minutes).toBe(10);
      expect(parsed.setFormat.based).toBe('P');
    });

    it('should build format with points-based scoring', () => {
      const config: any = {
        what: TIMED_SETS,
        minutes: 15,
        based: 'P',
        setTo: 6,
        tiebreakAt: 6,
        tiebreakTo: 7,
        winBy: 2,
        advantage: 'Ad',
      };

      const built = buildSetFormat(config, false);

      expect(built.timed).toBe(true);
      expect(built.minutes).toBe(15);
      expect(built.based).toBe('P');
    });
  });

  describe('Games-based scoring (T10 or T10G)', () => {
    it('should parse SET3X-S:T10 format (games is default)', () => {
      const parsed = initializeFormatFromString('SET3X-S:T10', matchUpFormatCode.parse);

      expect(parsed.setFormat.what).toBe(TIMED_SETS);
      expect(parsed.setFormat.minutes).toBe(10);
      // Games is default, so based should be undefined or 'G'
      expect([undefined, 'G']).toContain(parsed.setFormat.based);
    });

    it('should parse SET3X-S:T10G format explicitly', () => {
      const parsed = initializeFormatFromString('SET3X-S:T10G', matchUpFormatCode.parse);

      expect(parsed.setFormat.what).toBe(TIMED_SETS);
      expect(parsed.setFormat.minutes).toBe(10);
      // Explicit G should be preserved or omitted (both are valid)
      expect([undefined, 'G']).toContain(parsed.setFormat.based);
    });

    it('should build format without based property (games is default)', () => {
      const config: any = {
        what: TIMED_SETS,
        minutes: 10,
        // No 'based' property = games (default)
        setTo: 6,
        tiebreakAt: 6,
        tiebreakTo: 7,
        winBy: 2,
        advantage: 'Ad',
      };

      const built = buildSetFormat(config, false);

      expect(built.timed).toBe(true);
      expect(built.minutes).toBe(10);
      // Should not have 'based' property or it should be undefined/'G'
      expect([undefined, 'G']).toContain(built.based);
    });
  });

  describe('Set-level tiebreak notation', () => {
    it('should parse T10P/TB1 format', () => {
      const parsed = initializeFormatFromString('SET3X-S:T10P/TB1', matchUpFormatCode.parse);

      expect(parsed.setFormat.what).toBe(TIMED_SETS);
      expect(parsed.setFormat.minutes).toBe(10);
      expect(parsed.setFormat.based).toBe('P');
      // Should have tiebreak configuration
      expect(parsed.setFormat.tiebreakAt).toBeDefined();
    });
  });

  describe('Mixed formats (regular + timed)', () => {
    it('should parse SET3-S:6/TB7-F:T10P', () => {
      const parsed = initializeFormatFromString('SET3-S:6/TB7-F:T10P', matchUpFormatCode.parse);

      // Final set: timed points (check properties directly)
      expect(parsed.finalSetFormat.minutes).toBe(10);
      expect(parsed.finalSetFormat.based).toBe('P');
    });
  });

  describe('Backward compatibility', () => {
    it('should handle standard formats without based property', () => {
      const parsed = initializeFormatFromString('SET3-S:6/TB7', matchUpFormatCode.parse);

      expect(parsed.setFormat.what).toBe(SETS);
      expect(parsed.setFormat.based).toBeUndefined();
    });

    it('should handle SET1 format', () => {
      const parsed = initializeFormatFromString('SET1-S:6/TB7', matchUpFormatCode.parse);

      expect(parsed.setFormat.bestOf).toBe(1);
      expect(parsed.setFormat.what).toBe(SETS);
    });
  });

  describe('Different time durations', () => {
    it('should parse various minute values', () => {
      const formats = ['SET1-S:T5', 'SET1-S:T10P', 'SET1-S:T15', 'SET1-S:T20P', 'SET1-S:T30'];
      const expectedMinutes = [5, 10, 15, 20, 30];

      formats.forEach((format, index) => {
        const parsed = initializeFormatFromString(format, matchUpFormatCode.parse);
        expect(parsed.setFormat.minutes).toBe(expectedMinutes[index]);
      });
    });
  });

  describe('Removed based:A patterns (factory v2.4.2)', () => {
    it('T10A format strings are no longer valid (based:A removed)', () => {
      // Factory 2.4.2 removed set-level based:'A' (ambiguous with match-level aggregate)
      // These format strings now parse as undefined and fall back to defaults
      const parsed = initializeFormatFromString('SET3X-S:T10A', matchUpFormatCode.parse);

      // Falls back to default format since parse returns undefined
      expect(parsed.setFormat.what).toBe(SETS);
      expect(parsed.setFormat.based).toBeUndefined();
    });
  });
});
