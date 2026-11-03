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
    ratingMin?: string;
    ratingMax?: string;
    flights?: Array<{
        flightNumber: number;
        drawId: string;
        drawName: string;
    }>;
    isExisting: boolean;
}
export declare const DEFAULT_COLORS: string[];
export declare const RATING_SYSTEMS: ("WTN" | "UTR" | "NTRP" | "DUPR" | "TRN")[];
export declare const SPLIT_METHODS: {
    value: string;
    label: string;
    description: string;
}[];
/**
 * Generate flight names based on configuration
 */
export declare function generateFlightNames(state: FlightProfileState): string[];
/**
 * Build scale attributes object for factory
 */
export declare function buildScaleAttributes(state: FlightProfileState): any;
/**
 * Get split method constant
 */
export declare function getSplitMethodConstant(method: string): string;
/**
 * Parse existing flight profile
 */
export declare function parseExistingFlightProfile(flightProfile: any): Partial<FlightProfileState>;
/**
 * The rating band, if one was entered: `{ min?, max? }` for the factory's `scaleRange`. Only for a rating split.
 */
export declare function buildScaleRange(state: FlightProfileState): {
    min?: number;
    max?: number;
} | undefined;
/**
 * Validate flight profile state. `minFlights` is 2 unless the caller allows a single flight (a band's top flight).
 */
export declare function validateFlightProfile(state: FlightProfileState, { minFlights }?: {
    minFlights?: number;
}): string[];
/**
 * Get flight count options
 */
export declare function getFlightCountOptions(): number[];
