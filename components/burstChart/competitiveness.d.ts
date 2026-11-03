import { CompetitivenessBucket } from '../competitivenessBar/types';
export type CompetitiveBands = {
    DECISIVE: number;
    ROUTINE: number;
};
export declare const DEFAULT_COMPETITIVE_BANDS: CompetitiveBands;
/** matchUpStatus values that represent a result with no games to measure. */
export declare const WALKOVER_STATUSES: Set<string>;
/** Default segment fill per bucket — matches the competitivenessBar/donut palette. */
export declare const COMPETITIVENESS_COLORS: Record<CompetitivenessBucket, string>;
/** Fill for segments with no measurable result (entrant ring, BYEs, undecided). */
export declare const NEUTRAL_SEGMENT_COLOR = "#cfd8dc";
interface ScoreSet {
    side1Score?: number;
    side2Score?: number;
    side1TiebreakScore?: number;
    side2TiebreakScore?: number;
}
/**
 * Classify a structured score (array of sets) into a competitiveness bucket.
 * Returns undefined when there is nothing to measure (no sets / no games).
 */
export declare function getCompetitivenessBand(sets: ScoreSet[] | undefined, bands?: CompetitiveBands): CompetitivenessBucket | undefined;
/**
 * Classify a score string (e.g. "6-2 7-6(2)") into a competitiveness bucket.
 * Used by the legacy-draw adapter where only score strings are available.
 */
export declare function getCompetitivenessFromScoreString(scoreString: string | undefined, bands?: CompetitiveBands): CompetitivenessBucket | undefined;
/**
 * Single classification entry point used by both draw adapters. Prefers the
 * structured score (`sets`); falls back to parsing a `scoreString`. Walkovers /
 * defaults are bucketed by status since they carry no games.
 */
export declare function competitivenessForMatchUp({ winningSide, matchUpStatus, sets, scoreString, bands }: {
    winningSide?: number;
    matchUpStatus?: string;
    sets?: ScoreSet[];
    scoreString?: string;
    bands?: CompetitiveBands;
}): CompetitivenessBucket | undefined;
/** Resolve the fill color for a bucket, honoring per-chart overrides. */
export declare function competitivenessColor(bucket: CompetitivenessBucket | undefined, overrides?: Partial<Record<CompetitivenessBucket, string>>): string;
export {};
