/**
 * Competitiveness Bar — Type Definitions.
 */
export declare const COMPETITIVENESS_BUCKETS: readonly ["COMPETITIVE", "ROUTINE", "DECISIVE", "WALKOVER"];
export type CompetitivenessBucket = (typeof COMPETITIVENESS_BUCKETS)[number];
export type CompetitivenessBuckets = Record<CompetitivenessBucket, number>;
