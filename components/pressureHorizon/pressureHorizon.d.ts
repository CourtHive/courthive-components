import { HorizonSource } from './types';
import { ProjectedPressureResult, PressureSeries } from '../pressureChart/types';
export declare const HORIZON_ORDER: {
    readonly DRAW: "draw";
    readonly DIFFICULTY: "difficulty";
};
export type HorizonOrder = (typeof HORIZON_ORDER)[keyof typeof HORIZON_ORDER];
/**
 * How a row is drawn. Neither is a replacement for the other:
 *
 *  - WALLS  — one hard-edged column per round, magnitude folded into colour bands.
 *             Maximum density; reads down to 10px rows.
 *  - RIBBON — a connected line through the rounds inside a fan of possible
 *             opponents. Carries the spread the walls discard, and makes a near-zero
 *             delta visible instead of a 1px sliver. Wants ~22px.
 */
export declare const HORIZON_VARIANT: {
    readonly WALLS: "walls";
    readonly RIBBON: "ribbon";
};
export type HorizonVariant = (typeof HORIZON_VARIANT)[keyof typeof HORIZON_VARIANT];
export type PressureHorizonOptions = {
    /** Width of the wall strip, excluding the label gutter. */
    width?: number;
    rowHeight?: number;
    rowGap?: number;
    /** Surface gap between round columns. */
    columnGap?: number;
    bands?: number;
    variant?: HorizonVariant;
    source?: HorizonSource;
    /**
     * The projection `buildPressureSeries` returns beside `series`. Only the ribbon
     * reads it, and only to weight the inner fan; without it the fan falls back to the
     * unweighted low/high envelope and says so.
     */
    projection?: ProjectedPressureResult;
    /** Fix the domain across several stacks so they can be read against each other. */
    domainMax?: number;
    showLabels?: boolean;
    labelWidth?: number;
    showLegend?: boolean;
    showRoundHeader?: boolean;
    scaleName?: string;
    order?: HorizonOrder;
    /** Cap the rows rendered; the number dropped is stated in the caption. */
    limit?: number;
    onSelect?: (series: PressureSeries) => void;
    roundLabels?: (roundNumber: number, index: number, total: number) => string;
    emptyMessage?: string;
};
export type PressureHorizonInstance = {
    element: HTMLElement;
    update: (series: PressureSeries[], options?: PressureHorizonOptions) => void;
    destroy: () => void;
};
export declare function buildPressureHorizon(container: HTMLElement, series?: PressureSeries[], options?: PressureHorizonOptions): PressureHorizonInstance;
