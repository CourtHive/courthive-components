import { BuildHorizonRowsParams, HorizonRowsResult, HorizonSource, HorizonLayer } from './types';
import { PressureSeriesPoint, PressureSeries } from '../pressureChart/types';
/** Four steps per arm. More than four stops reading as ordered at row heights this small. */
export declare const DEFAULT_BANDS = 4;
/**
 * Floor on the domain, in ELO points. Without it a draw whose deltas are all tiny
 * would autoscale until rounding noise filled the darkest band — the horizon
 * equivalent of a truncated y-axis, and just as misleading.
 */
export declare const MIN_HORIZON_DOMAIN = 60;
/** The value a cell paints, and whether it came from a played matchUp. */
export declare function selectCellValue(point: PressureSeriesPoint, source: HorizonSource): {
    value: number | null;
    fromActual: boolean;
};
/**
 * Split a magnitude into paintable layers.
 *
 * Returns `clipped: true` when the magnitude ran past the domain — the wall is
 * capped at the darkest band and the caller is expected to say so rather than
 * let the reader assume the cap is the true value.
 */
export declare function bandLayers({ magnitude, bands, domainMax }: {
    magnitude: number;
    bands?: number;
    domainMax: number;
}): {
    layers: HorizonLayer[];
    clipped: boolean;
};
/**
 * One domain across every row, so a stack of rows is actually a comparison.
 *
 * Letting each row autoscale is the single easiest way to make this chart lie:
 * an easy road and a brutal one would paint identically.
 */
export declare function resolveHorizonDomain(series: PressureSeries[], source: HorizonSource): number;
export declare function buildHorizonRows({ series, source, bands, domainMax, projection }: BuildHorizonRowsParams): HorizonRowsResult;
