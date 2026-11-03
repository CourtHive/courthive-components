import { PressureSeries } from './types';
export type PressureSmallMultiplesOptions = {
    cellWidth?: number;
    cellHeight?: number;
    /** Cap the cells rendered; the number dropped is stated in the caption. */
    limit?: number;
    scaleName?: string;
    onSelect?: (series: PressureSeries) => void;
    emptyMessage?: string;
};
export type PressureSmallMultiplesInstance = {
    element: HTMLElement;
    update: (series: PressureSeries[], options?: PressureSmallMultiplesOptions) => void;
};
/** One y domain across every cell, so the grid can be read as a comparison. */
export declare function sharedYDomain(series: PressureSeries[]): [number, number];
export declare function buildPressureSmallMultiples(container: HTMLElement, series?: PressureSeries[], options?: PressureSmallMultiplesOptions): PressureSmallMultiplesInstance;
