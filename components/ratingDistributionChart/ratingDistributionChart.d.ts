import { DistributionBin, RatingDistributionStats } from 'tods-competition-factory';
export type RatingDistributionChartMode = 'HISTOGRAM' | 'DONUT';
export interface RatingDistributionChartOptions {
    mode?: RatingDistributionChartMode;
    width?: number;
    height?: number;
    showAxis?: boolean;
    showCounts?: boolean;
    showMean?: boolean;
    margin?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    binColor?: (bin: DistributionBin, index: number) => string;
    ariaLabel?: string;
}
export declare function buildRatingDistributionChart(stats: RatingDistributionStats, options?: RatingDistributionChartOptions): SVGSVGElement;
