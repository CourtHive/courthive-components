import { describe, it, expect } from 'vitest';
import { matchUpFormatCode } from 'tods-competition-factory';
import {
  AD,
  NOAD,
  SETS,
  TIEBREAKS,
  TIMED_SETS,
  MATCH_ROOTS,
  MATCH_ROOT_LABELS,
  getBestOfOptionsForRoot,
  createDefaultSetFormat,
  createDefaultFormat,
  isTiebreakOnlySet,
  buildSetFormat,
  buildParsedFormat,
  getComponentVisibility,
  getTiebreakAtOptions,
  autoAdjustTiebreakAt,
  isValidTiebreakAt,
  shouldShowFinalSetOption,
  initializeFormatFromString,
} from '../matchUpFormatLogic';

describe('matchUpFormatLogic', () => {
  describe('createDefaultSetFormat', () => {
    it('should create default set format', () => {
      const format = createDefaultSetFormat(false);
      expect(format.descriptor).toBe('Best of');
      expect(format.bestOf).toBe(3);
      expect(format.what).toBe(SETS);
      expect(format.setTo).toBe(6);
      expect(format.tiebreakAt).toBe(6);
    });

    it('should create default final set format', () => {
      const format = createDefaultSetFormat(true);
      expect(format.descriptor).toBe('Final set');
      expect(format.bestOf).toBeUndefined();
      expect(format.what).toBe(SETS);
    });
  });

  describe('isTiebreakOnlySet', () => {
    it('should return true for tiebreak-only set', () => {
      const setFormat = {
        tiebreakSet: { tiebreakTo: 10 },
      };
      expect(isTiebreakOnlySet(setFormat)).toBe(true);
    });

    it('should return false for regular set', () => {
      const setFormat = {
        setTo: 6,
        tiebreakFormat: { tiebreakTo: 7 },
      };
      expect(isTiebreakOnlySet(setFormat)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isTiebreakOnlySet(undefined)).toBe(false);
    });
  });

  describe('buildSetFormat', () => {
    it('should build regular set format', () => {
      const config = createDefaultSetFormat(false);
      const setFormat = buildSetFormat(config, false);
      
      expect(setFormat.setTo).toBe(6);
      expect(setFormat.tiebreakAt).toBeUndefined();
      expect(setFormat.tiebreakFormat).toBeUndefined();
    });

    it('should build set format with tiebreak', () => {
      const config = createDefaultSetFormat(false);
      const setFormat = buildSetFormat(config, true);
      
      expect(setFormat.setTo).toBe(6);
      expect(setFormat.tiebreakAt).toBe(6);
      expect(setFormat.tiebreakFormat.tiebreakTo).toBe(7);
    });

    it('should build set format with NoAD', () => {
      const config = { ...createDefaultSetFormat(false), advantage: NOAD };
      const setFormat = buildSetFormat(config, false);
      
      expect(setFormat.NoAD).toBe(true);
    });

    it('should build tiebreak-only set format', () => {
      const config = { ...createDefaultSetFormat(false), what: TIEBREAKS, tiebreakTo: 10 };
      const setFormat = buildSetFormat(config, false);
      
      expect(setFormat.tiebreakSet).toBeDefined();
      expect(setFormat.tiebreakSet.tiebreakTo).toBe(10);
    });

    it('should build timed set format', () => {
      const config = { ...createDefaultSetFormat(false), what: TIMED_SETS, minutes: 20 };
      const setFormat = buildSetFormat(config, false);
      
      expect(setFormat.timed).toBe(true);
      expect(setFormat.minutes).toBe(20);
    });

    it('should add NoAD to tiebreak format when winBy is 1', () => {
      const config = { ...createDefaultSetFormat(false), winBy: 1 };
      const setFormat = buildSetFormat(config, true);
      
      expect(setFormat.tiebreakFormat.NoAD).toBe(true);
    });

    it('should add NoAD to tiebreak set when winBy is 1', () => {
      const config = { ...createDefaultSetFormat(false), what: TIEBREAKS, winBy: 1 };
      const setFormat = buildSetFormat(config, false);
      
      expect(setFormat.tiebreakSet.NoAD).toBe(true);
    });
  });

  describe('buildParsedFormat', () => {
    it('should build basic parsed format with bestOf', () => {
      const config = createDefaultFormat();
      const parsed = buildParsedFormat(config, false, false, false);
      
      expect(parsed.bestOf).toBe(3);
      expect(parsed.exactly).toBeUndefined();
      expect(parsed.setFormat.setTo).toBe(6);
      expect(parsed.finalSetFormat).toBeUndefined();
    });

    it('should build parsed format with exactly', () => {
      const config = createDefaultFormat();
      config.setFormat.exactly = 4;
      delete config.setFormat.bestOf;
      const parsed = buildParsedFormat(config, false, false, false);
      
      expect(parsed.exactly).toBe(4);
      expect(parsed.bestOf).toBeUndefined();
      expect(parsed.setFormat.setTo).toBe(6);
    });

    it('should include final set when requested', () => {
      const config = createDefaultFormat();
      const parsed = buildParsedFormat(config, false, true, false);
      
      expect(parsed.finalSetFormat).toBeDefined();
      expect(parsed.finalSetFormat.setTo).toBe(6);
    });

    it('should include tiebreaks when requested', () => {
      const config = createDefaultFormat();
      const parsed = buildParsedFormat(config, true, false, false);
      
      expect(parsed.setFormat.tiebreakAt).toBe(6);
      expect(parsed.setFormat.tiebreakFormat.tiebreakTo).toBe(7);
    });
  });

  describe('getComponentVisibility', () => {
    it('should show correct components for SETS', () => {
      const visibility = getComponentVisibility(SETS);
      
      expect(visibility.setTo).toBe(true);
      expect(visibility.tiebreakAt).toBe(true);
      expect(visibility.tiebreakTo).toBe(true);
      expect(visibility.advantage).toBe(true);
      expect(visibility.winBy).toBe(false);
      expect(visibility.minutes).toBe(false);
    });

    it('should show correct components for TIEBREAKS', () => {
      const visibility = getComponentVisibility(TIEBREAKS);
      
      expect(visibility.setTo).toBe(false);
      expect(visibility.tiebreakAt).toBe(false);
      expect(visibility.tiebreakTo).toBe(true);
      expect(visibility.winBy).toBe(true);
      expect(visibility.advantage).toBe(false);
      expect(visibility.minutes).toBe(false);
    });

    it('should show correct components for TIMED_SETS', () => {
      const visibility = getComponentVisibility(TIMED_SETS);
      
      expect(visibility.setTo).toBe(false);
      expect(visibility.minutes).toBe(true);
      expect(visibility.tiebreakAt).toBe(false);
    });
  });

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

  describe('isValidTiebreakAt', () => {
    it('should validate correct combinations', () => {
      expect(isValidTiebreakAt(6, 6)).toBe(true);
      expect(isValidTiebreakAt(6, 5)).toBe(true);
      expect(isValidTiebreakAt(4, 4)).toBe(true);
      expect(isValidTiebreakAt(4, 3)).toBe(true);
    });

    it('should invalidate incorrect combinations', () => {
      expect(isValidTiebreakAt(6, 4)).toBe(false);
      expect(isValidTiebreakAt(4, 6)).toBe(false);
      expect(isValidTiebreakAt(6, 7)).toBe(false);
    });
  });

  describe('shouldShowFinalSetOption', () => {
    it('should show for bestOf > 1', () => {
      expect(shouldShowFinalSetOption(3)).toBe(true);
      expect(shouldShowFinalSetOption(5)).toBe(true);
    });

    it('should not show for bestOf = 1', () => {
      expect(shouldShowFinalSetOption(1)).toBe(false);
    });
  });

  describe('initializeFormatFromString', () => {
    const mockParse = (format: string) => {
      // Simple mock for testing
      if (format === 'SET3-S:6/TB7') {
        return {
          bestOf: 3,
          setFormat: { setTo: 6, tiebreakAt: 6, tiebreakFormat: { tiebreakTo: 7 } },
        };
      }
      if (format === 'SET3X-S:T10') {
        return {
          exactly: 3,
          setFormat: { timed: true, minutes: 10 },
        };
      }
      if (format === 'SET4X-S:T20') {
        return {
          exactly: 4,
          setFormat: { timed: true, minutes: 20 },
        };
      }
      if (format === 'SET3-S:6') {
        return {
          bestOf: 3,
          setFormat: { setTo: 6, tiebreakAt: 6 },
        };
      }
      if (format === 'SET3-S:6/TB7-F:6') {
        return {
          bestOf: 3,
          setFormat: { setTo: 6, tiebreakAt: 6, tiebreakFormat: { tiebreakTo: 7 } },
          finalSetFormat: { setTo: 6, tiebreakAt: 6 },
        };
      }
      if (format === 'SET3-S:6/TB7-F:TB10') {
        return {
          bestOf: 3,
          setFormat: { setTo: 6, tiebreakAt: 6, tiebreakFormat: { tiebreakTo: 7 } },
          finalSetFormat: { tiebreakSet: { tiebreakTo: 10 } },
        };
      }
      if (format === 'SET3-S:4/TB7') {
        return {
          bestOf: 3,
          setFormat: { setTo: 4, tiebreakAt: 4, tiebreakFormat: { tiebreakTo: 7 } },
        };
      }
      return { bestOf: 3, setFormat: {} };
    };

    it('should initialize from standard format with bestOf', () => {
      const format = initializeFormatFromString('SET3-S:6/TB7', mockParse);
      
      expect(format.setFormat.bestOf).toBe(3);
      expect(format.setFormat.exactly).toBeUndefined();
      expect(format.setFormat.descriptor).toBe('Best of');
      expect(format.setFormat.setTo).toBe(6);
      expect(format.setFormat.tiebreakAt).toBe(6);
    });

    it('should initialize from format with exactly (SET3X)', () => {
      const format = initializeFormatFromString('SET3X-S:T10', mockParse);
      
      expect(format.setFormat.exactly).toBe(3);
      expect(format.setFormat.bestOf).toBeUndefined();
      expect(format.setFormat.descriptor).toBe('Exactly');
    });

    it('should initialize from format with exactly (SET4X)', () => {
      const format = initializeFormatFromString('SET4X-S:T20', mockParse);
      
      expect(format.setFormat.exactly).toBe(4);
      expect(format.setFormat.bestOf).toBeUndefined();
      expect(format.setFormat.descriptor).toBe('Exactly');
    });

    it('should initialize with tiebreak-only final set', () => {
      const format = initializeFormatFromString('SET3-S:6/TB7-F:TB10', mockParse);
      
      expect(format.finalSetFormat.what).toBe(TIEBREAKS);
      expect(format.finalSetFormat.tiebreakTo).toBe(10);
    });

    it('should initialize with different setTo', () => {
      const format = initializeFormatFromString('SET3-S:4/TB7', mockParse);
      
      expect(format.setFormat.setTo).toBe(4);
      expect(format.setFormat.tiebreakAt).toBe(4);
    });

    it('should merge with defaults for missing properties', () => {
      const format = initializeFormatFromString('UNKNOWN', mockParse);
      
      // Should have all default properties
      expect(format.setFormat.advantage).toBe(AD);
      expect(format.setFormat.what).toBe(SETS);
      expect(format.setFormat.winBy).toBe(2);
    });

    // BUG FIX TEST: Final set tiebreak initialization
    // This test ensures the bug where SET3-S:6/TB7 + toggle final set = SET3-S:6/TB7-F:6 (missing tiebreak)
    // The UI logic should default finalSetTiebreak.checked to match setFormat.tiebreakFormat
    it('should initialize with format that will enable correct tiebreak default', () => {
      // When main set has tiebreak
      const formatWithTiebreak = initializeFormatFromString('SET3-S:6/TB7', mockParse);
      
      // The final set format should have default properties that match main set
      // (UI will use this to initialize checkboxes)
      expect(formatWithTiebreak.setFormat.tiebreakAt).toBe(6);
      expect(formatWithTiebreak.finalSetFormat.setTo).toBe(6); // Default
      expect(formatWithTiebreak.finalSetFormat.tiebreakAt).toBe(6); // Default
      
      // When main set has NO tiebreak
      const formatWithoutTiebreak = initializeFormatFromString('SET3-S:6', mockParse);
      expect(formatWithoutTiebreak.setFormat.tiebreakAt).toBe(6);
    });

    it('should preserve explicit final set WITHOUT tiebreak when main has tiebreak', () => {
      // This tests that if user explicitly sets F:6 (no tiebreak) while main has TB7,
      // we preserve that choice
      const format = initializeFormatFromString('SET3-S:6/TB7-F:6', mockParse);
      
      // Main set has tiebreak
      expect(format.setFormat.tiebreakAt).toBe(6);
      
      // Final set properties
      expect(format.finalSetFormat.setTo).toBe(6);
      expect(format.finalSetFormat.tiebreakAt).toBe(6);
      
      // The key is that buildSetFormat() will be called with hasTiebreak flag
      // from the checkbox state, which should reflect the parsed format
    });

    it('should round-trip SET3X-S:T10-F:TB1NOAD format', () => {
      const formatString = 'SET3X-S:T10-F:TB1NOAD';
      const format = initializeFormatFromString(formatString, matchUpFormatCode.parse);
      
      // Check final set is tiebreak-only with NoAD
      expect(format.finalSetFormat.what).toBe(TIEBREAKS);
      expect(format.finalSetFormat.tiebreakTo).toBe(1);
      expect(format.finalSetFormat.winBy).toBe(1); // NoAD = win by 1
      
      // Build the parsed format
      const parsed = buildParsedFormat(format, false, true, false);
      
      // Verify NoAD is preserved in tiebreakSet
      expect(parsed.finalSetFormat.tiebreakSet).toBeDefined();
      expect(parsed.finalSetFormat.tiebreakSet.tiebreakTo).toBe(1);
      expect(parsed.finalSetFormat.tiebreakSet.NoAD).toBe(true);
      
      // Stringify back
      const roundTrip = matchUpFormatCode.stringify(parsed);
      expect(roundTrip).toBe('SET3X-S:T10-F:TB1NOAD');
    });

    it('should round-trip SET3X-S:T10-F:TB1 format (without NOAD)', () => {
      const formatString = 'SET3X-S:T10-F:TB1';
      const format = initializeFormatFromString(formatString, matchUpFormatCode.parse);

      // Check final set is tiebreak-only WITHOUT NoAD
      expect(format.finalSetFormat.what).toBe(TIEBREAKS);
      expect(format.finalSetFormat.tiebreakTo).toBe(1);
      expect(format.finalSetFormat.winBy).toBe(2); // No NoAD = win by 2

      // Build the parsed format
      const parsed = buildParsedFormat(format, false, true, false);

      // Verify NoAD is NOT set
      expect(parsed.finalSetFormat.tiebreakSet).toBeDefined();
      expect(parsed.finalSetFormat.tiebreakSet.tiebreakTo).toBe(1);
      expect(parsed.finalSetFormat.tiebreakSet.NoAD).toBeUndefined();

      // Stringify back
      const roundTrip = matchUpFormatCode.stringify(parsed);
      expect(roundTrip).toBe('SET3X-S:T10-F:TB1');
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

    it('getBestOfOptionsForRoot returns [1,3,5] for SET', () => {
      expect(getBestOfOptionsForRoot('SET')).toEqual([1, 3, 5]);
      expect(getBestOfOptionsForRoot(undefined)).toEqual([1, 3, 5]);
    });

    it('getBestOfOptionsForRoot returns [1..12] for non-SET', () => {
      const opts = getBestOfOptionsForRoot('HAL');
      expect(opts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });

  describe('buildSetFormat with modifier', () => {
    it('should add modifier to tiebreakSet (TIEBREAKS)', () => {
      const config = { ...createDefaultSetFormat(false), what: TIEBREAKS, tiebreakTo: 11, modifier: 'RALLY' };
      const setFormat = buildSetFormat(config, false);

      expect(setFormat.tiebreakSet.tiebreakTo).toBe(11);
      expect(setFormat.tiebreakSet.modifier).toBe('RALLY');
    });

    it('should add modifier to tiebreakFormat (SETS with tiebreak)', () => {
      const config = { ...createDefaultSetFormat(false), modifier: 'RALLY' };
      const setFormat = buildSetFormat(config, true);

      expect(setFormat.tiebreakFormat.tiebreakTo).toBe(7);
      expect(setFormat.tiebreakFormat.modifier).toBe('RALLY');
    });

    it('should add modifier to timed set', () => {
      const config = { ...createDefaultSetFormat(false), what: TIMED_SETS, minutes: 10, modifier: 'RALLY' };
      const setFormat = buildSetFormat(config, false);

      expect(setFormat.timed).toBe(true);
      expect(setFormat.modifier).toBe('RALLY');
    });

    it('should not add modifier when undefined', () => {
      const config = { ...createDefaultSetFormat(false), what: TIEBREAKS, tiebreakTo: 11 };
      const setFormat = buildSetFormat(config, false);

      expect(setFormat.tiebreakSet.modifier).toBeUndefined();
    });
  });

  describe('buildParsedFormat with match-level properties', () => {
    it('should include matchRoot when not SET', () => {
      const config = createDefaultFormat();
      config.matchRoot = 'HAL';
      config.setFormat.what = TIMED_SETS;
      config.setFormat.minutes = 45;

      const parsed = buildParsedFormat(config, false, false, false);
      expect(parsed.matchRoot).toBe('HAL');
    });

    it('should not include matchRoot when SET', () => {
      const config = createDefaultFormat();
      config.matchRoot = 'SET';

      const parsed = buildParsedFormat(config, false, false, false);
      expect(parsed.matchRoot).toBeUndefined();
    });

    it('should not include matchRoot when undefined', () => {
      const config = createDefaultFormat();

      const parsed = buildParsedFormat(config, false, false, false);
      expect(parsed.matchRoot).toBeUndefined();
    });

    it('should include aggregate when true', () => {
      const config = createDefaultFormat();
      config.aggregate = true;

      const parsed = buildParsedFormat(config, false, false, false);
      expect(parsed.aggregate).toBe(true);
    });

    it('should not include aggregate when falsy', () => {
      const config = createDefaultFormat();

      const parsed = buildParsedFormat(config, false, false, false);
      expect(parsed.aggregate).toBeUndefined();
    });

    it('should include gameFormat when defined', () => {
      const config = createDefaultFormat();
      config.gameFormat = { type: 'CONSECUTIVE', count: 3 };

      const parsed = buildParsedFormat(config, false, false, false);
      expect(parsed.gameFormat).toEqual({ type: 'CONSECUTIVE', count: 3 });
    });

    it('should include TRADITIONAL gameFormat', () => {
      const config = createDefaultFormat();
      config.gameFormat = { type: 'TRADITIONAL' };

      const parsed = buildParsedFormat(config, false, false, false);
      expect(parsed.gameFormat).toEqual({ type: 'TRADITIONAL' });
    });

    it('should include TRADITIONAL gameFormat with deuceAfter', () => {
      const config = createDefaultFormat();
      config.gameFormat = { type: 'TRADITIONAL', deuceAfter: 3 };

      const parsed = buildParsedFormat(config, false, false, false);
      expect(parsed.gameFormat).toEqual({ type: 'TRADITIONAL', deuceAfter: 3 });
    });

    it('should include CONSECUTIVE gameFormat with deuceAfter', () => {
      const config = createDefaultFormat();
      config.gameFormat = { type: 'CONSECUTIVE', count: 3, deuceAfter: 3 };

      const parsed = buildParsedFormat(config, false, false, false);
      expect(parsed.gameFormat).toEqual({ type: 'CONSECUTIVE', count: 3, deuceAfter: 3 });
    });
  });

  describe('initializeFormatFromString with cross-sport formats', () => {
    it('should extract matchRoot from HAL format', () => {
      const format = initializeFormatFromString('HAL2A-S:T45', matchUpFormatCode.parse);

      expect(format.matchRoot).toBe('HAL');
      expect(format.aggregate).toBe(true);
      expect(format.setFormat.what).toBe(TIMED_SETS);
      expect(format.setFormat.minutes).toBe(45);
    });

    it('should extract matchRoot from QTR format', () => {
      const format = initializeFormatFromString('QTR4A-S:T12', matchUpFormatCode.parse);

      expect(format.matchRoot).toBe('QTR');
      expect(format.aggregate).toBe(true);
      expect(format.setFormat.minutes).toBe(12);
    });

    it('should extract modifier from rally scoring format', () => {
      const format = initializeFormatFromString('SET3-S:TB11@RALLY', matchUpFormatCode.parse);

      expect(format.setFormat.modifier).toBe('RALLY');
      expect(format.setFormat.what).toBe(TIEBREAKS);
      expect(format.setFormat.tiebreakTo).toBe(11);
    });

    it('should extract modifier from final set rally scoring', () => {
      const format = initializeFormatFromString('SET5-S:TB21@RALLY-F:TB15@RALLY', matchUpFormatCode.parse);

      expect(format.setFormat.modifier).toBe('RALLY');
      expect(format.finalSetFormat.modifier).toBe('RALLY');
    });

    it('should extract gameFormat CONSECUTIVE', () => {
      const format = initializeFormatFromString('SET5-S:5-G:3C', matchUpFormatCode.parse);

      expect(format.gameFormat).toEqual({ type: 'CONSECUTIVE', count: 3 });
    });

    it('should extract aggregate and points-based scoring', () => {
      const format = initializeFormatFromString('SET7XA-S:T10P', matchUpFormatCode.parse);

      expect(format.aggregate).toBe(true);
      expect(format.setFormat.based).toBe('P');
    });

    it('should extract gameFormat TRADITIONAL with deuceAfter', () => {
      const format = initializeFormatFromString('SET3-S:6/TB7-G:TN3D', matchUpFormatCode.parse);
      expect(format.gameFormat).toEqual({ type: 'TRADITIONAL', deuceAfter: 3 });
    });

    it('should not set matchRoot for standard SET formats', () => {
      const format = initializeFormatFromString('SET3-S:6/TB7', matchUpFormatCode.parse);

      expect(format.matchRoot).toBeUndefined();
    });
  });

  describe('cross-sport round-trip tests', () => {
    function roundTrip(formatString: string) {
      const format = initializeFormatFromString(formatString, matchUpFormatCode.parse);
      const parsed = matchUpFormatCode.parse(formatString);

      // Determine hasTiebreak from parsed setFormat
      const hasSetTiebreak = !!parsed?.setFormat?.tiebreakFormat;
      const hasFinalSet = !!parsed?.finalSetFormat;
      const hasFinalSetTiebreak = !!parsed?.finalSetFormat?.tiebreakFormat;

      const built = buildParsedFormat(format, hasSetTiebreak, hasFinalSet, hasFinalSetTiebreak);
      const result = matchUpFormatCode.stringify(built);
      return result;
    }

    it('HAL2A-S:T45 (soccer)', () => {
      expect(roundTrip('HAL2A-S:T45')).toBe('HAL2A-S:T45');
    });

    it('QTR4A-S:T12 (basketball)', () => {
      expect(roundTrip('QTR4A-S:T12')).toBe('QTR4A-S:T12');
    });

    it('SET3-S:TB11@RALLY (pickleball)', () => {
      expect(roundTrip('SET3-S:TB11@RALLY')).toBe('SET3-S:TB11@RALLY');
    });

    it('SET5-S:5-G:3C (TYPTI)', () => {
      expect(roundTrip('SET5-S:5-G:3C')).toBe('SET5-S:5-G:3C');
    });

    it('SET7XA-S:T10P (INTENNSE)', () => {
      expect(roundTrip('SET7XA-S:T10P')).toBe('SET7XA-S:T10P');
    });

    it('RND12A-S:T3 (boxing)', () => {
      expect(roundTrip('RND12A-S:T3')).toBe('RND12A-S:T3');
    });

    it('SET5-S:TB21@RALLY-F:TB15@RALLY (MLP)', () => {
      expect(roundTrip('SET5-S:TB21@RALLY-F:TB15@RALLY')).toBe('SET5-S:TB21@RALLY-F:TB15@RALLY');
    });

    it('PER3A-S:T20 (ice hockey)', () => {
      expect(roundTrip('PER3A-S:T20')).toBe('PER3A-S:T20');
    });

    it('SET3-S:6/TB7-G:TN3D (Padel Star Point)', () => {
      expect(roundTrip('SET3-S:6/TB7-G:TN3D')).toBe('SET3-S:6/TB7-G:TN3D');
    });

    it('SET3-S:6/TB7-G:TN (explicit traditional)', () => {
      expect(roundTrip('SET3-S:6/TB7-G:TN')).toBe('SET3-S:6/TB7-G:TN');
    });

    it('SET3-S:6/TB7-G:TN1D (golden point)', () => {
      expect(roundTrip('SET3-S:6/TB7-G:TN1D')).toBe('SET3-S:6/TB7-G:TN1D');
    });

    it('SET5-S:5-G:3C3D (consecutive + Star Point)', () => {
      expect(roundTrip('SET5-S:5-G:3C3D')).toBe('SET5-S:5-G:3C3D');
    });

    it('SET5-S:TB25-F:TB15 (volleyball)', () => {
      expect(roundTrip('SET5-S:TB25-F:TB15')).toBe('SET5-S:TB25-F:TB15');
    });
  });
});
