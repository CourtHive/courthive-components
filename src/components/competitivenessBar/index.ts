/**
 * Competitiveness Bar — Public API.
 */

import './competitiveness-bar.css';

export { buildCompetitivenessBar } from './buildCompetitivenessBar';
export { aggregateCompetitiveness, totalBuckets } from './aggregateCompetitiveness';
export { COMPETITIVENESS_BUCKETS } from './types';

export type { BuildCompetitivenessBarResult } from './buildCompetitivenessBar';
export type { CompetitivenessBucket, CompetitivenessBuckets } from './types';
