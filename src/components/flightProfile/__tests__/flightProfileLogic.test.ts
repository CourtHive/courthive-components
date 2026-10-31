import { eventConstants } from 'tods-competition-factory';
import { describe, it, expect } from 'vitest';

const { DOUBLES, SINGLES } = eventConstants;
/**
 * Tests for Flight Profile logic functions
 */
import {
  generateFlightNames,
  buildScaleAttributes,
  getSplitMethodConstant,
  parseExistingFlightProfile,
  validateFlightProfile,
  buildScaleRange,
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
        eventType: SINGLES,
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const attrs = buildScaleAttributes(state);
      expect(attrs).toEqual({
        accessor: 'wtnRating',
        ascending: true,
        scaleType: 'RATING',
        eventType: SINGLES,
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
        eventType: DOUBLES,
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const attrs = buildScaleAttributes(state);
      expect(attrs).toEqual({
        scaleType: 'RANKING',
        eventType: DOUBLES
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
          eventType: SINGLES
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
          eventType: DOUBLES
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
          eventType: SINGLES
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
        eventType: SINGLES,
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
        eventType: SINGLES,
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
        eventType: SINGLES,
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
        eventType: SINGLES,
        splitMethod: 'LEVEL_BASED',
        isExisting: false
      };

      const errors = validateFlightProfile(state);
      expect(errors).toContain('Rating system must be selected');
    });

    it('should not require event type (added by caller after modal)', () => {
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
      expect(errors.length).toBe(0);
    });
  });
  describe('rating band', () => {
    const base: FlightProfileState = {
      flightsCount: 2,
      namingType: 'colors',
      customName: 'Flight',
      suffixType: 'numbers',
      scaleType: 'RATING',
      scaleName: 'WTN',
      splitMethod: 'LEVEL_BASED',
      isExisting: false
    };

    it('builds scaleRange from either or both ends, and nothing when empty', () => {
      expect(buildScaleRange(base)).toBeUndefined();
      expect(buildScaleRange({ ...base, ratingMin: ' ', ratingMax: '' })).toBeUndefined();
      expect(buildScaleRange({ ...base, ratingMin: '10' })).toEqual({ min: 10 });
      expect(buildScaleRange({ ...base, ratingMax: '4.5' })).toEqual({ max: 4.5 });
      expect(buildScaleRange({ ...base, ratingMin: '0', ratingMax: '12' })).toEqual({ min: 0, max: 12 });
    });

    it('applies only to a rating split', () => {
      expect(buildScaleRange({ ...base, scaleType: 'RANKING', ratingMin: '1', ratingMax: '5' })).toBeUndefined();
    });

    it('refuses a band that is not numeric or is reversed', () => {
      expect(validateFlightProfile({ ...base, ratingMin: '5', ratingMax: '10' })).toEqual([]);
      expect(validateFlightProfile({ ...base, ratingMin: 'abc' })).toEqual(['Rating band values must be numbers']);
      expect(validateFlightProfile({ ...base, ratingMin: '10', ratingMax: '5' })).toEqual([
        'Rating band: "from" must not be greater than "to"'
      ]);
    });

    it('allows a single flight only when the caller lowers the minimum', () => {
      const single = { ...base, flightsCount: 1 };
      expect(validateFlightProfile(single)).toEqual(['Must have at least 2 flights']);
      expect(validateFlightProfile(single, { minFlights: 1 })).toEqual([]);
    });
  });
});
