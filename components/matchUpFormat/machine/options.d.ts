/**
 * What the picker offers for a match root and a set's tiebreak point. Moved unchanged from the retired
 * `matchUpFormatLogic.ts`, whose other exports served the modal the state machine replaced.
 */
export declare const MATCH_ROOTS: readonly ["SET", "HAL", "QTR", "PER", "INN", "RND", "FRM", "MAP"];
export declare const MATCH_ROOT_LABELS: Record<string, string>;
/**
 * Returns valid bestOf options for a given match root.
 * SET root: [1,3,5,7,9] — odd counts; the factory parses any best-of count (#5136)
 * Other roots: [1..12] (wide range for cross-sport)
 */
export declare function getBestOfOptionsForRoot(matchRoot?: string): number[];
/**
 * Calculate valid tiebreakAt options based on setTo value
 */
export declare function getTiebreakAtOptions(setTo: number): number[];
/**
 * Auto-adjust tiebreakAt when setTo changes
 * Returns the new tiebreakAt value that should be used
 */
export declare function autoAdjustTiebreakAt(newSetTo: number, currentTiebreakAt: number): number;
