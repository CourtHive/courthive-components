import { PressureSeries } from './types';
export type PathDifficultyBarOptions = {
    width?: number;
    rowHeight?: number;
    labelWidth?: number;
    /** Cap the rows rendered. When set, the count dropped is stated in the caption. */
    limit?: number;
    /** Overlay the difficulty actually faced so far, where a participant has played. */
    showActual?: boolean;
    onSelect?: (series: PressureSeries) => void;
    emptyMessage?: string;
};
export type PathDifficultyBarInstance = {
    element: HTMLElement;
    update: (series: PressureSeries[], options?: PathDifficultyBarOptions) => void;
};
export declare function buildPathDifficultyBar(container: HTMLElement, series?: PressureSeries[], options?: PathDifficultyBarOptions): PathDifficultyBarInstance;
