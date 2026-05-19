/**
 * Competitiveness Bar — Type Definitions.
 */

export const COMPETITIVENESS_BUCKETS = ['COMPETITIVE', 'ROUTINE', 'DECISIVE', 'WALKOVER'] as const;
export type CompetitivenessBucket = (typeof COMPETITIVENESS_BUCKETS)[number];
export type CompetitivenessBuckets = Record<CompetitivenessBucket, number>;
