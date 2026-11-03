import { HorizonRow } from './types';
export type HorizonRowOptions = {
    width: number;
    height: number;
    gap?: number;
    /**
     * Attach per-wall `<title>` tooltips and a descriptive aria-label. MUST stay
     * false in the game: a tooltip carrying the opponent rating hands over the
     * deduction the puzzle is asking for.
     */
    describe?: boolean;
    /** Used only when `describe` is true. */
    roundLabels?: (roundNumber: number, index: number, total: number) => string;
    scaleName?: string;
    /** Overrides the aria-label. In the game this is the slot number, never a name. */
    ariaLabel?: string;
};
/** The strip for one participant. Columns are laid out on the row's own cell order. */
export declare function buildHorizonRowSvg(row: HorizonRow, options: HorizonRowOptions): SVGSVGElement;
