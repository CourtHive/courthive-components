import { DistributionBin, RatingDistributionStats } from 'tods-competition-factory';
import { ScaleBand } from 'd3';
/**
 * The geometry and labels of a rating distribution chart, computed without a DOM. `ratingDistributionChart`
 * draws exactly what these return; everything here is in the chart's own SVG user units.
 */
export type Margin = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};
export type BinColor = (bin: DistributionBin, index: number) => string;
export declare function resolveBinColor(bin: DistributionBin, index: number, total: number, override?: BinColor): string;
export declare function formatBinLabel(bin: DistributionBin): string;
export interface HistogramBar {
    bin: DistributionBin;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    /** The bar's hover title. */
    title: string;
    /** The count above the bar: `''` for an empty bin, so a zero draws no label. */
    countText: string;
    countX: number;
    countY: number;
}
export interface HistogramModel {
    innerWidth: number;
    innerHeight: number;
    x: ScaleBand<string>;
    bars: HistogramBar[];
    /** Every bin label when they all fit, else just the first and last as range anchors. */
    tickValues: string[];
    /** The mean line's x, or undefined when it is off, not finite, or outside the bins' range. */
    meanX: number | undefined;
}
/** Undefined when there is nothing to draw: no bins, or no room inside the margins. */
export declare function histogramModel({ binColor, showMean, margin, height, width, stats }: {
    binColor?: BinColor;
    showMean: boolean;
    margin: Margin;
    height: number;
    width: number;
    stats: RatingDistributionStats;
}): HistogramModel | undefined;
export declare function polarToCartesian(cx: number, cy: number, radius: number, angle: number): [number, number];
export interface DonutSlice {
    bin: DistributionBin;
    /** Angles in radians, clockwise from 12 o'clock. */
    start: number;
    end: number;
    d: string;
    fill: string;
    labelText: string;
    labelX: number;
    labelY: number;
}
export interface DonutModel {
    cx: number;
    cy: number;
    outer: number;
    inner: number;
    /** One per NON-EMPTY bin: a zero-count bin has no slice. */
    slices: DonutSlice[];
    /** The total participant count, drawn in the centre. */
    centerText: string;
}
/** Undefined when there is nothing to draw: no bins, or a zero count. */
export declare function donutModel({ binColor, margin, stats, size }: {
    binColor?: BinColor;
    margin: Margin;
    stats: RatingDistributionStats;
    size: number;
}): DonutModel | undefined;
