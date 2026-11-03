import { HorizonRow } from './types';
export type HorizonRibbonOptions = {
    width: number;
    height: number;
    domainMax: number;
    /** Colour bands across the domain. Must match the walls or the two stop reading alike. */
    bands?: number;
    /**
     * How many colour bands of the domain map to HALF the row height.
     *
     * This is the ribbon's version of the fold, and it is the setting that decides
     * whether the chart is readable. A centred line splits the row between the two
     * arms, so mapping the whole domain across it leaves a median value moving about
     * three pixels — measured on a 16-draw, `|delta|` has a median of 238 against a
     * 668 domain, which on a 22px row is 3.4px of travel. Mapping half the domain
     * instead doubles every amplitude and leaves roughly a third of cells saturating
     * at the row edge, where the gradient keeps them distinguishable.
     */
    positionBands?: number;
    /** Attach hover descriptions. MUST stay false in the game — a title names the answer. */
    describe?: boolean;
    roundLabels?: (roundNumber: number, index: number, total: number) => string;
    scaleName?: string;
    ariaLabel?: string;
    /** Draw the even-match reference line. */
    showZeroLine?: boolean;
};
export declare function buildHorizonRibbonSvg(row: HorizonRow, options: HorizonRibbonOptions): SVGSVGElement;
