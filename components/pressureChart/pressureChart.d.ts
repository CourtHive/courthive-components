import { PressureSeries, PressureSeriesPoint } from './types';
export type PressureChartOptions = {
    width?: number;
    height?: number;
    margin?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    /** Compact mode for the small-multiples grid: no labels, no legend, thin marks. */
    spark?: boolean;
    /** Fix the y domain across a set of charts so small multiples are comparable. */
    yDomain?: [number, number];
    /** Label for the rating scale, e.g. 'WTN'. Shown on the axis. */
    scaleName?: string;
    showLegend?: boolean;
    ariaLabel?: string;
    roundLabels?: (roundNumber: number, index: number, total: number) => string;
    emptyMessage?: string;
};
export type PressureChartInstance = {
    element: HTMLElement;
    update: (series: PressureSeries | undefined, options?: PressureChartOptions) => void;
    destroy: () => void;
};
/** QF / SF / F for the last three rounds, R1.. before that — matches the round-nav convention. */
export declare function defaultRoundLabel(_roundNumber: number, index: number, total: number): string;
/** Symmetric domain around zero so "playing up" and "playing down" read equally. */
export declare function resolveYDomain(points: PressureSeriesPoint[], override?: [number, number]): [number, number];
/** Round a half-extent down to a readable 1 / 2 / 5 x 10^n step. */
export declare function niceStep(extent: number): number;
/**
 * Build (or rebuild) the chart into a container.
 *
 * Returns a handle so a consumer can re-render on a live update without
 * re-querying the DOM. `update(undefined)` renders the empty state — an unrated
 * field is a legitimate outcome, not an error.
 */
export declare function buildPressureChart(container: HTMLElement, series?: PressureSeries, options?: PressureChartOptions): PressureChartInstance;
