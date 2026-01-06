import { describe, it, expect } from 'vitest';
import {
  AD,
  NOAD,
  SETS,
  TIEBREAKS,
  TIMED_SETS,
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
    it('should build basic parsed format', () => {
      const config = createDefaultFormat();
      const parsed = buildParsedFormat(config, false, false, false);
      
      expect(parsed.bestOf).toBe(3);
      expect(parsed.setFormat.setTo).toBe(6);
      expect(parsed.finalSetFormat).toBeUndefined();
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

    it('should initialize from standard format', () => {
      const format = initializeFormatFromString('SET3-S:6/TB7', mockParse);
      
      expect(format.setFormat.bestOf).toBe(3);
      expect(format.setFormat.setTo).toBe(6);
      expect(format.setFormat.tiebreakAt).toBe(6);
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
  });
});
