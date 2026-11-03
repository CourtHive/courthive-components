import { CompetitivenessBucket, CompetitivenessBuckets } from './types';
export interface BuildCompetitivenessBarOptions {
    /** When supplied, segments become clickable filter drivers. */
    onSegmentClick?: (bucket: CompetitivenessBucket) => void;
}
export interface BuildCompetitivenessBarResult {
    element: HTMLElement;
    update: (buckets: CompetitivenessBuckets) => void;
    /** Highlight the active bucket (dimming the rest); pass null to clear. */
    setActive: (bucket: CompetitivenessBucket | null) => void;
}
export declare function buildCompetitivenessBar(options?: BuildCompetitivenessBarOptions): BuildCompetitivenessBarResult;
