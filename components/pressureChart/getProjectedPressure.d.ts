import { WinProbabilityModel } from './winProbability';
import { ProjectedPressureResult } from './types';
/** Opponents below this arrival probability are excluded from the displayed range. */
export declare const DEFAULT_RANGE_THRESHOLD = 0.01;
export type GetProjectedPressureParams = {
    /** Structure matchUps, hydrated with sides + participants. */
    matchUps: any[];
    /** SINGLES (default) or DOUBLES — selects which ratings block to read. */
    matchUpType?: string;
    /** Prefer this scale when a participant carries several. */
    scaleName?: string;
    /** Pairwise model knobs; see `winProbability`. */
    model?: WinProbabilityModel;
    /**
     * When true, a played matchUp collapses to its actual winner, so the
     * projection reads "from here". Default **false** — the untouched projection
     * is what the draw said at the outset, which is the comparison the chart makes.
     */
    respectResults?: boolean;
    /** Arrival-probability floor for inclusion in `opponentEloRange`. */
    rangeThreshold?: number;
};
export declare function getProjectedPressure(params: GetProjectedPressureParams): ProjectedPressureResult;
