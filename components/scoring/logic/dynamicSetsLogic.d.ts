import { SetScore } from '../types';
/**
 * Set format information returned by matchUpFormatCode.parse()
 *
 * ── `NoAD`, and why the casing is load-bearing ──
 *
 * This type is a hand-written MIRROR of what `matchUpFormatCode.parse` emits, and it named the
 * no-advantage flag `noAd` while the factory emits **`NoAD`**. Measured 2026-09-28:
 * `parse('SET1-S:TB10NOAD').setFormat.tiebreakSet` is `{ tiebreakTo: 10, NoAD: true }`, so every read
 * of `.noAd` in this module answered `undefined` for every format — and the TYPE is what made those
 * reads look correct.
 *
 * Nothing threw and nothing logged; no-advantage scoring was simply ignored. Two measured
 * consequences, both live in the shipping dialog: a low of 6 in a `TB7NOAD` completed to **8** instead
 * of 7, and a low of 5 in `S:6NOAD` completed to **7** instead of 6 — a 7-5 in a format where first to
 * six wins.
 *
 * Every OTHER reader of this flag in the package had it right — `freeScore.ts` and the format picker
 * (`matchUpFormat/machine/codec.ts`) both read `.NoAD`. This one type was the outlier, which
 * is the shape the architectural standards call mock divergence: a hand-written mirror that renames a
 * field and then certifies the rename.
 */
export type SetFormat = {
    setTo?: number;
    tiebreakAt?: number;
    /** No-advantage on the SET — with no tiebreak, the set ends at `setTo` without a two-game margin. */
    NoAD?: boolean;
    tiebreakFormat?: {
        tiebreakTo?: number;
        NoAD?: boolean;
    };
    tiebreakSet?: {
        tiebreakTo?: number;
        NoAD?: boolean;
    };
    timed?: boolean;
    minutes?: number;
    noTiebreak?: boolean;
    winBy?: number;
};
/**
 * Configuration for a matchUp
 * Should be derived from TODS matchUpFormat strings using matchUpFormatCode.parse()
 */
export type MatchUpConfig = {
    bestOf: number;
    exactly?: number;
    aggregate?: boolean;
    setFormat?: SetFormat;
    finalSetFormat?: SetFormat;
    overtimeFormat?: Record<string, any>;
};
/**
 * Result of smart complement calculation
 */
export type SmartComplementResult = {
    field1Value: number;
    field2Value: number;
    shouldApply: boolean;
    reason?: string;
};
export declare function matchUpConfigFor(matchUpFormat?: string): MatchUpConfig;
export declare function getSetFormatForIndex(setIndex: number, config: MatchUpConfig): SetFormat | undefined;
/**
 * Check if a set is tiebreak-only (e.g., TB10)
 */
export declare function isSetTiebreakOnly(format?: SetFormat): boolean;
/**
 * Check if a set format is timed (e.g., T10, T20)
 */
export declare function isSetTimed(format?: SetFormat): boolean;
/**
 * The highest game (or tiebreak-point) score one side may enter, given the opponent's.
 *
 * ── Delegated to the factory ──
 *
 * `scoreGovernor.getMaxSetScore` answers for a games set from the format alone: the tiebreak games,
 * `tiebreakAt` above or below `setTo`, a declared `winBy`. It answers `undefined` where the format has no
 * ceiling — a timed set, an advantage set past the tiebreak-less `setTo`, or a tiebreak-only set, whose
 * points are not games — and each of those is handled here by the factory's own tiebreak complement or
 * by the set's margin, not by recomputing tennis.
 *
 * The hand-rolled body this replaced read a tiebreak-only set as a six-game set: `SET1-S:TB10` with no
 * opponent score was capped at **7** — a match tiebreak to ten that could not be entered (measured
 * 2026-10-08, live in the shipping dialog). It now caps at the complement of the opponent's points: 10,
 * then 12 against 10, and `NoAD` ends it at the target.
 *
 * One convention of the calling dialog is kept: an opponent score of 0 means "not entered yet" and allows
 * the format's ceiling. Where the opponent's games already hold the set, the answer is the factory's
 * ceiling (CA, 2026-10-08: "follow the factory") — 7 under `S:6/TB7`, 5 under `S:5/TB9@4` — and the old
 * "extended play" read of 9, a tiebreak set running on like an advantage set, is gone.
 */
export declare function getMaxAllowedScore(setIndex: number, side: 1 | 2, currentScores: {
    side1: number;
    side2: number;
}, config: MatchUpConfig): number;
/**
 * Determine if a set is complete based on its scores
 */
export declare function isSetComplete(setIndex: number, scores: {
    side1: number;
    side2: number;
    tiebreak?: number;
}, config: MatchUpConfig): boolean;
/**
 * Calculate which side won a set
 * Returns undefined if set is not complete
 */
export declare function getSetWinner(setIndex: number, scores: {
    side1: number;
    side2: number;
    tiebreak?: number;
}, config: MatchUpConfig): 1 | 2 | undefined;
/**
 * Determine if match is complete based on sets won
 */
export declare function isMatchComplete(sets: SetScore[], config: MatchUpConfig): boolean;
/**
 * Get the match winner based on sets won
 * Returns undefined if match is not complete
 */
export declare function getMatchWinner(sets: SetScore[], config: MatchUpConfig): 1 | 2 | undefined;
/**
 * Calculate the complement score for smart complement entry
 * Returns null if no predictable complement exists
 *
 * @param digit - The digit entered (0-9)
 * @param setFormat - The format for this set
 * @returns Complement value or null if digit >= setTo (no predictable complement)
 */
export declare function calculateComplement(digit: number, setFormat?: SetFormat): number | null;
/**
 * Determine if smart complement should be applied for a given input
 *
 * @param digit - The digit being entered
 * @param isShiftPressed - Whether Shift key is pressed
 * @param setIndex - Index of the current set
 * @param sets - Current sets array
 * @param config - Match configuration
 * @param smartComplementsUsed - Set of indices where complement was already used
 * @param smartComplementsEnabled - Whether feature is enabled in settings
 * @returns Result indicating if/how complement should be applied
 */
export declare function shouldApplySmartComplement(digit: number, isShiftPressed: boolean, setIndex: number, sets: SetScore[], config: MatchUpConfig, smartComplementsUsed: Set<number>, smartComplementsEnabled: boolean): SmartComplementResult;
/**
 * Determine if tiebreak input should be visible for a set
 */
export declare function shouldShowTiebreak(setIndex: number, scores: {
    side1: number;
    side2: number;
}, config: MatchUpConfig): boolean;
/**
 * Determine if a new set row should be created
 */
export declare function shouldCreateNextSet(currentSetIndex: number, sets: SetScore[], config: MatchUpConfig): boolean;
/**
 * Build a SetScore object from input values
 * Assigns winningSide if set is complete
 */
export declare function buildSetScore(setIndex: number, side1Value: string, side2Value: string, tiebreakValue: string | undefined, config: MatchUpConfig): SetScore;
