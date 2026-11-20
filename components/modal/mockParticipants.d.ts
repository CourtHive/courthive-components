/** Offered in the count field's dropdown; any other whole number in range can be typed. */
export declare const PARTICIPANTS_COUNT_PRESETS: number[];
export declare const PARTICIPANTS_COUNT_MIN = 1;
/** A generous ceiling: a mock field larger than this is a typo, not a tournament. */
export declare const PARTICIPANTS_COUNT_MAX = 128;
/**
 * The count the generator will use for whatever is in the field: a whole number clamped to
 * [PARTICIPANTS_COUNT_MIN, PARTICIPANTS_COUNT_MAX]. Anything that is not a number falls back to `fallback`
 * (itself clamped), so an emptied field generates the default rather than nothing.
 */
export declare function clampParticipantsCount(value: unknown, fallback?: number): number;
/**
 * Configuration for mock participants generation
 */
export interface MockParticipantsConfig {
    /** Callback invoked when participants are generated */
    callback?: (participants: any[]) => void;
    /** Tournament end date for birthdate calculation (ISO format: YYYY-MM-DD) */
    consideredDate?: string;
    /** Custom title for the modal */
    title?: string;
    /** Custom labels for form fields */
    labels?: {
        gender?: string;
        count?: string;
        ageRange?: string;
        minAge?: string;
        maxAge?: string;
        ratings?: string;
        countries?: string;
        role?: string;
        cancel?: string;
        generate?: string;
        genderAny?: string;
        genderFemale?: string;
        genderMale?: string;
        /** @deprecated Use ratings label instead */
        wtn?: string;
        /** @deprecated Use ratings label instead */
        utr?: string;
    };
    /** Default values for form fields */
    defaults?: {
        gender?: string;
        participantsCount?: number;
        participantRole?: string;
        ageMin?: number;
        ageMax?: number;
        nationalityCodesCount?: number;
        /** Array of rating type names to pre-select (e.g., ['WTN', 'UTR', 'DUPR']) */
        ratings?: string[];
        /** @deprecated Use ratings: ['WTN'] instead */
        wtnRating?: boolean;
        /** @deprecated Use ratings: ['UTR'] instead */
        utrRating?: boolean;
    };
    /** Available participant role options. If not provided, only COMPETITOR is used. */
    roleOptions?: {
        label: string;
        value: string;
    }[];
}
/**
 * Opens a modal for generating mock participants with configurable options.
 *
 * Features:
 * - Gender selection (Any/Male/Female)
 * - Participant count: presets 8-128 or any whole number typed in, clamped to 1-128
 * - Age range with automatic validation (ageMax >= ageMin)
 * - Number of countries to limit nationality diversity
 * - Optional WTN/UTR ratings
 * - Birthdate generation based on consideredDate and age range
 *
 * @param config - Configuration options
 * @returns void
 *
 * @example
 * // Basic usage
 * getMockParticipantsModal({
 *   callback: (participants) => {
 *     console.log('Generated participants:', participants);
 *     // Add participants to tournament
 *   }
 * });
 *
 * @example
 * // With consideredDate and defaults
 * getMockParticipantsModal({
 *   consideredDate: '2024-12-31',
 *   callback: (participants) => {
 *     // Add participants to tournament
 *   },
 *   defaults: {
 *     participantsCount: 64,
 *     ageMin: 10,
 *     ageMax: 18,
 *     nationalityCodesCount: 10,
 *     wtnRating: true
 *   }
 * });
 */
export declare function getMockParticipantsModal(config?: MockParticipantsConfig): void;
