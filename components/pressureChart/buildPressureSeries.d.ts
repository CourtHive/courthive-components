import { ProjectedPressureResult, PressureSeries } from './types';
import { GetProjectedPressureParams } from './getProjectedPressure';
export type BuildPressureSeriesParams = GetProjectedPressureParams;
export type PressureSeriesResult = {
    series: PressureSeries[];
    projection: ProjectedPressureResult;
    /** The rating scale the values were read from, for axis labelling. */
    scaleName?: string;
    unratedCount: number;
};
export declare function buildPressureSeries(params: BuildPressureSeriesParams): PressureSeriesResult;
/**
 * Participants ordered hardest SLOT first — the ranked "path difficulty" view,
 * and the entry point of the all-players surface.
 *
 * Sorts on `slotDifficulty`, not `pathDifficulty`: the reach-weighted figure
 * discounts the late rounds a weak player is unlikely to reach, so ranking on it
 * would report the toughest draws in the field as the easiest. Unrated
 * participants sort last rather than being dropped, so the field size stays honest.
 */
export declare function byPathDifficulty(series: PressureSeries[]): PressureSeries[];
