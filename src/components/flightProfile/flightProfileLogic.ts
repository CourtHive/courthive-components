/**
 * Pure logic functions for Flight Profile configuration.
 * Handles flight naming, split methods, and scale attributes.
 */

export interface FlightProfileState {
  flightsCount: number;
  namingType: 'colors' | 'custom';
  customName: string;
  suffixType: 'letters' | 'numbers';
  scaleType: 'RANKING' | 'RATING';
  scaleName?: string;
  eventType?: string;
  splitMethod: 'WATERFALL' | 'LEVEL_BASED' | 'SHUTTLE';
  flights?: Array<{
    flightNumber: number;
    drawId: string;
    drawName: string;
  }>;
  isExisting: boolean;
}

export const DEFAULT_COLORS = [
  'Blue',
  'Red',
  'Green',
  'Orange',
  'Purple',
  'Yellow',
  'Pink',
  'Gold',
  'Silver',
  'Bronze'
];

export const RATING_SYSTEMS = ['WTN', 'UTR', 'TRN', 'NTRP', 'DUPR'];

export const SPLIT_METHODS = [
  { value: 'WATERFALL', label: 'Waterfall', description: 'Distributes evenly: 1→2→3→1→2→3 (like dealing cards)' },
  { value: 'LEVEL_BASED', label: 'Level Based', description: 'Groups by skill tiers: [1-5], [6-10], [11-15]' },
  { value: 'SHUTTLE', label: 'Shuttle', description: 'Alternating direction: 1→2→3→3→2→1→1→2→3 (like a loom shuttle)' }
];

/**
 * Generate flight names based on configuration
 */
export function generateFlightNames(state: FlightProfileState): string[] {
  const { flightsCount, namingType, customName, suffixType } = state;
  const names: string[] = [];

  for (let i = 0; i < flightsCount; i++) {
    if (namingType === 'colors') {
      names.push(DEFAULT_COLORS[i] || `Flight ${i + 1}`);
    } else {
      const suffix =
        suffixType === 'letters'
          ? String.fromCodePoint(65 + i) // A, B, C...
          : (i + 1).toString(); // 1, 2, 3...
      names.push(`${customName || 'Flight'} ${suffix}`);
    }
  }

  return names;
}

/**
 * Build scale attributes object for factory
 */
export function buildScaleAttributes(state: FlightProfileState): any {
  const base: any = {
    scaleType: state.scaleType
  };

  // Add eventType if present in state
  if (state.eventType) {
    base.eventType = state.eventType;
  }

  // Add scaleName for RATING type
  if (state.scaleType === 'RATING' && state.scaleName) {
    base.scaleName = state.scaleName;
  }

  return base;
}

/**
 * Get split method constant
 */
export function getSplitMethodConstant(method: string): string {
  const methodMap: Record<string, string> = {
    WATERFALL: 'splitWaterfall',
    LEVEL_BASED: 'splitLevelBased',
    SHUTTLE: 'splitShuttle'
  };
  return methodMap[method] || 'splitLevelBased';
}

/**
 * Parse existing flight profile
 */
export function parseExistingFlightProfile(flightProfile: any): Partial<FlightProfileState> {
  if (!flightProfile) return {};

  const { flights, scaleAttributes, splitMethod } = flightProfile;

  // Try to detect naming pattern
  let namingType: 'colors' | 'custom' = 'custom';
  let customName = 'Flight';
  let suffixType: 'letters' | 'numbers' = 'numbers';

  if (flights && flights.length > 0) {
    const firstName = flights[0].drawName;

    // Check if it matches color pattern
    if (DEFAULT_COLORS.includes(firstName)) {
      namingType = 'colors';
    } else {
      // Try to extract pattern from name like "Flight A" or "Flight 1"
      const match = firstName.match(/^(.+?)\s+([A-Z]|\d+)$/);
      if (match) {
        customName = match[1];
        suffixType = /[A-Z]/.test(match[2]) ? 'letters' : 'numbers';
      }
    }
  }

  // Map split method from constant to UI value
  const splitMethodMap: Record<string, 'WATERFALL' | 'LEVEL_BASED' | 'SHUTTLE'> = {
    splitWaterfall: 'WATERFALL',
    splitLevelBased: 'LEVEL_BASED',
    splitShuttle: 'SHUTTLE'
  };

  return {
    flightsCount: flights?.length || 2,
    namingType,
    customName,
    suffixType,
    scaleType: scaleAttributes?.scaleType || 'RATING',
    scaleName: scaleAttributes?.scaleName,
    eventType: scaleAttributes?.eventType,
    splitMethod: splitMethodMap[splitMethod] || 'LEVEL_BASED',
    flights: flights?.map((f: any) => ({
      flightNumber: f.flightNumber,
      drawId: f.drawId,
      drawName: f.drawName
    })),
    isExisting: true
  };
}

/**
 * Validate flight profile state
 */
export function validateFlightProfile(state: FlightProfileState): string[] {
  const errors: string[] = [];

  if (!state.flightsCount || Number.isNaN(state.flightsCount) || state.flightsCount <= 0) {
    errors.push('Number of flights must be a valid number greater than 0');
  } else if (state.flightsCount < 2) {
    errors.push('Must have at least 2 flights');
  } else if (state.flightsCount > 10) {
    errors.push('Maximum 10 flights allowed');
  }

  if (state.scaleType === 'RATING' && !state.scaleName) {
    errors.push('Rating system must be selected');
  }

  // Note: eventType is NOT validated here because it's added by the caller
  // after the modal returns (see Storybook helper: generateAndDisplayFlights)

  return errors;
}

/**
 * Get flight count options
 */
export function getFlightCountOptions(): number[] {
  return [2, 3, 4, 5, 6, 7, 8, 9, 10];
}
