import { SetScore } from '../types';
type MatchUpFormatInfo = {
    bestOf: number;
    exactly?: number;
    setsToWin: number;
    isTimed: boolean;
    isExactlyFormat: boolean;
};
/**
 * Parse match format string to extract best-of information
 * Examples: "SET3-S:6/TB7" → bestOf=3, "SET5-S:6/TB7" → bestOf=5
 * Examples: "SET3X-S:T10" → exactly=3, isTimed=true
 */
export declare function parseMatchUpFormat(matchUpFormat?: string): MatchUpFormatInfo;
/**
 * Determine if another set should be added based on current scores
 */
export declare function shouldExpandSets(sets: SetScore[], matchUpFormat?: string): boolean;
/**
 * Determine the winning side based on set scores
 * Handles both regular scoring (sets won) and aggregate scoring (total points)
 */
export declare function determineWinningSide(sets: SetScore[], matchUpFormat?: string): number | undefined;
export {};
