import { CompetitivenessBuckets } from './types';
export interface BuildCompetitivenessDonutResult {
    element: HTMLElement;
    update: (buckets: CompetitivenessBuckets) => void;
}
export declare function buildCompetitivenessDonut(): BuildCompetitivenessDonutResult;
