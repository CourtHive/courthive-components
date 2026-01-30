/**
 * Tests for Flight Profile logic functions
 */
import {
  generateFlightNames,
  buildScaleAttributes,
  getSplitMethodConstant,
  parseExistingFlightProfile,
  validateFlightProfile,
  type FlightProfileState
} from '../flightProfileLogic';

describe('Flight Profile Logic', () => {
  describe('generateFlightNames', () => {
    it('should generate color names', () => {
      const state: FlightProfileState = {
        flightsCount: 3,
        namingType: 'colors',
        customName: 'Flight',
        suffixType: 'numbers',
        scaleType: 'RATING',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const names = generateFlightNames(state);
      expect(names).toEqual(['Blue', 'Red', 'Green']);
    });

    it('should generate custom names with letters', () => {
      const state: FlightProfileState = {
        flightsCount: 3,
        namingType: 'custom',
        customName: 'Flight',
        suffixType: 'letters',
        scaleType: 'RATING',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const names = generateFlightNames(state);
      expect(names).toEqual(['Flight A', 'Flight B', 'Flight C']);
    });

    it('should generate custom names with numbers', () => {
      const state: FlightProfileState = {
        flightsCount: 3,
        namingType: 'custom',
        customName: 'Division',
        suffixType: 'numbers',
        scaleType: 'RATING',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const names = generateFlightNames(state);
      expect(names).toEqual(['Division 1', 'Division 2', 'Division 3']);
    });
  });

  describe('buildScaleAttributes', () => {
    it('should build rating scale attributes', () => {
      const state: FlightProfileState = {
        flightsCount: 2,
        namingType: 'colors',
        customName: 'Flight',
        suffixType: 'numbers',
        scaleType: 'RATING',
        scaleName: 'WTN',
        eventType: 'SINGLES',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const attrs = buildScaleAttributes(state);
      expect(attrs).toEqual({
        scaleType: 'RATING',
        eventType: 'SINGLES',
        scaleName: 'WTN'
      });
    });

    it('should build ranking scale attributes', () => {
      const state: FlightProfileState = {
        flightsCount: 2,
        namingType: 'colors',
        customName: 'Flight',
        suffixType: 'numbers',
        scaleType: 'RANKING',
        eventType: 'DOUBLES',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const attrs = buildScaleAttributes(state);
      expect(attrs).toEqual({
        scaleType: 'RANKING',
        eventType: 'DOUBLES'
      });
    });
  });

  describe('getSplitMethodConstant', () => {
    it('should return correct constants', () => {
      expect(getSplitMethodConstant('WATERFALL')).toBe('splitWaterfall');
      expect(getSplitMethodConstant('LEVEL_BASED')).toBe('splitLevelBased');
      expect(getSplitMethodConstant('SHUTTLE')).toBe('splitShuttle');
    });

    it('should default to LEVEL_BASED for unknown method', () => {
      expect(getSplitMethodConstant('UNKNOWN')).toBe('splitLevelBased');
    });
  });

  describe('parseExistingFlightProfile', () => {
    it('should parse existing profile with color names', () => {
      const existingProfile = {
        flights: [
          { flightNumber: 1, drawId: 'id1', drawName: 'Gold' },
          { flightNumber: 2, drawId: 'id2', drawName: 'Silver' }
        ],
        scaleAttributes: {
          scaleType: 'RATING',
          scaleName: 'UTR',
          eventType: 'SINGLES'
        },
        splitMethod: 'splitWaterfall'
      };

      const parsed = parseExistingFlightProfile(existingProfile);

      expect(parsed.flightsCount).toBe(2);
      expect(parsed.namingType).toBe('colors');
      expect(parsed.scaleType).toBe('RATING');
      expect(parsed.scaleName).toBe('UTR');
      expect(parsed.splitMethod).toBe('WATERFALL');
      expect(parsed.isExisting).toBe(true);
    });

    it('should parse existing profile with custom names and letters', () => {
      const existingProfile = {
        flights: [
          { flightNumber: 1, drawId: 'id1', drawName: 'Flight A' },
          { flightNumber: 2, drawId: 'id2', drawName: 'Flight B' }
        ],
        scaleAttributes: {
          scaleType: 'RANKING',
          eventType: 'DOUBLES'
        },
        splitMethod: 'splitLevelBased'
      };

      const parsed = parseExistingFlightProfile(existingProfile);

      expect(parsed.flightsCount).toBe(2);
      expect(parsed.namingType).toBe('custom');
      expect(parsed.customName).toBe('Flight');
      expect(parsed.suffixType).toBe('letters');
      expect(parsed.scaleType).toBe('RANKING');
      expect(parsed.splitMethod).toBe('LEVEL_BASED');
    });

    it('should parse existing profile with custom names and numbers', () => {
      const existingProfile = {
        flights: [
          { flightNumber: 1, drawId: 'id1', drawName: 'Division 1' },
          { flightNumber: 2, drawId: 'id2', drawName: 'Division 2' }
        ],
        scaleAttributes: {
          scaleType: 'RATING',
          scaleName: 'NTRP',
          eventType: 'SINGLES'
        },
        splitMethod: 'splitShuttle'
      };

      const parsed = parseExistingFlightProfile(existingProfile);

      expect(parsed.flightsCount).toBe(2);
      expect(parsed.namingType).toBe('custom');
      expect(parsed.customName).toBe('Division');
      expect(parsed.suffixType).toBe('numbers');
      expect(parsed.splitMethod).toBe('SHUTTLE');
    });
  });

  describe('validateFlightProfile', () => {
    it('should validate valid profile', () => {
      const state: FlightProfileState = {
        flightsCount: 3,
        namingType: 'colors',
        customName: 'Flight',
        suffixType: 'numbers',
        scaleType: 'RATING',
        scaleName: 'WTN',
        eventType: 'SINGLES',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const errors = validateFlightProfile(state);
      expect(errors).toEqual([]);
    });

    it('should require at least 2 flights', () => {
      const state: FlightProfileState = {
        flightsCount: 1,
        namingType: 'colors',
        customName: 'Flight',
        suffixType: 'numbers',
        scaleType: 'RATING',
        scaleName: 'WTN',
        eventType: 'SINGLES',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const errors = validateFlightProfile(state);
      expect(errors).toContain('Must have at least 2 flights');
    });

    it('should limit to 10 flights', () => {
      const state: FlightProfileState = {
        flightsCount: 11,
        namingType: 'colors',
        customName: 'Flight',
        suffixType: 'numbers',
        scaleType: 'RATING',
        scaleName: 'WTN',
        eventType: 'SINGLES',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const errors = validateFlightProfile(state);
      expect(errors).toContain('Maximum 10 flights allowed');
    });

    it('should require rating system for RATING scale type', () => {
      const state: FlightProfileState = {
        flightsCount: 3,
        namingType: 'colors',
        customName: 'Flight',
        suffixType: 'numbers',
        scaleType: 'RATING',
        eventType: 'SINGLES',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const errors = validateFlightProfile(state);
      expect(errors).toContain('Rating system must be selected');
    });

    it('should require event type', () => {
      const state: FlightProfileState = {
        flightsCount: 3,
        namingType: 'colors',
        customName: 'Flight',
        suffixType: 'numbers',
        scaleType: 'RATING',
        scaleName: 'WTN',
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const errors = validateFlightProfile(state);
      expect(errors).toContain('Event type must be specified');
    });
  });
});
