/**
 * Competitiveness — Public API (bar + donut variants).
 */

import './competitiveness-bar.css';
import './competitiveness-donut.css';

export { buildCompetitivenessBar } from './buildCompetitivenessBar';
export { buildCompetitivenessDonut } from './buildCompetitivenessDonut';
export { aggregateCompetitiveness, totalBuckets } from './aggregateCompetitiveness';
export { COMPETITIVENESS_BUCKETS } from './types';

export type { BuildCompetitivenessBarResult, BuildCompetitivenessBarOptions } from './buildCompetitivenessBar';
export type { BuildCompetitivenessDonutResult } from './buildCompetitivenessDonut';
export type { CompetitivenessBucket, CompetitivenessBuckets } from './types';
