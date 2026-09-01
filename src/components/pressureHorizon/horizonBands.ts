/**
 * Fold signed-delta values into horizon bands.
 *
 * Pure — no DOM, no d3. Everything the renderer needs about magnitude is decided
 * here so it can be asserted without a browser, which is the ecosystem rule for
 * courthive-components: DOM behaviour is proved by Storybook play functions,
 * decisions are proved by vitest against pure functions.
 *
 * The fold: with `bands` steps across `domainMax`, a magnitude of 2.6 steps
 * paints three layers — two full and one at 0.6 — each anchored to the same edge
 * of the row. Because they overlap, the visible result is the darkest full step
 * across the whole wall with a darker cap over its shallow end. That is what lets
 * a 16px row carry a range four times its own height.
 */

// constants and types
import { HORIZON_DIRECTION, HORIZON_SOURCE } from './types';
import type {
  BuildHorizonRowsParams,
  HorizonRowsResult,
  HorizonDirection,
  HorizonSource,
  HorizonLayer,
  HorizonCell,
  HorizonRow
} from './types';
import type { PressureSeries, PressureSeriesPoint } from '../pressureChart/types';

/** Four steps per arm. More than four stops reading as ordered at row heights this small. */
export const DEFAULT_BANDS = 4;

/**
 * Floor on the domain, in ELO points. Without it a draw whose deltas are all tiny
 * would autoscale until rounding noise filled the darkest band — the horizon
 * equivalent of a truncated y-axis, and just as misleading.
 */
export const MIN_HORIZON_DOMAIN = 60;

/** The value a cell paints, and whether it came from a played matchUp. */
export function selectCellValue(
  point: PressureSeriesPoint,
  source: HorizonSource
): { value: number | null; fromActual: boolean } {
  if (source === HORIZON_SOURCE.ACTUAL && point.actual !== null && point.actual !== undefined) {
    return { value: point.actual, fromActual: true };
  }
  return { value: point.projected.expected, fromActual: false };
}

/**
 * Split a magnitude into paintable layers.
 *
 * Returns `clipped: true` when the magnitude ran past the domain — the wall is
 * capped at the darkest band and the caller is expected to say so rather than
 * let the reader assume the cap is the true value.
 */
export function bandLayers({
  magnitude,
  bands = DEFAULT_BANDS,
  domainMax
}: {
  magnitude: number;
  bands?: number;
  domainMax: number;
}): { layers: HorizonLayer[]; clipped: boolean } {
  if (!(domainMax > 0) || !(magnitude > 0) || bands < 1) return { layers: [], clipped: false };

  const step = domainMax / bands;
  const layers: HorizonLayer[] = [];
  for (let bandIndex = 0; bandIndex < bands; bandIndex++) {
    const remaining = magnitude - bandIndex * step;
    if (remaining <= 0) break;
    layers.push({ bandIndex, fraction: Math.min(1, remaining / step) });
  }
  return { layers, clipped: magnitude > domainMax };
}

/**
 * One domain across every row, so a stack of rows is actually a comparison.
 *
 * Letting each row autoscale is the single easiest way to make this chart lie:
 * an easy road and a brutal one would paint identically.
 */
export function resolveHorizonDomain(series: PressureSeries[], source: HorizonSource): number {
  const magnitudes = series.flatMap((entry) =>
    entry.points
      .map((point) => selectCellValue(point, source).value)
      .filter((value): value is number => value !== null)
      .map(Math.abs)
  );
  if (!magnitudes.length) return MIN_HORIZON_DOMAIN;
  return Math.max(MIN_HORIZON_DOMAIN, ...magnitudes);
}

function emptyCell(roundNumber: number, point?: PressureSeriesPoint): HorizonCell {
  return {
    roundNumber,
    value: null,
    direction: null,
    layers: [],
    clipped: false,
    fromActual: false,
    reachProbability: point?.reachProbability ?? 0,
    bye: Boolean(point?.bye),
    resolved: Boolean(point?.resolved)
  };
}

function directionOf(value: number): HorizonDirection {
  return value >= 0 ? HORIZON_DIRECTION.HARD : HORIZON_DIRECTION.EASY;
}

function buildCell({
  roundNumber,
  point,
  source,
  bands,
  domainMax
}: {
  roundNumber: number;
  point: PressureSeriesPoint | undefined;
  source: HorizonSource;
  bands: number;
  domainMax: number;
}): HorizonCell {
  if (!point || point.bye) return emptyCell(roundNumber, point);

  const { value, fromActual } = selectCellValue(point, source);
  if (value === null) return emptyCell(roundNumber, point);

  const { layers, clipped } = bandLayers({ magnitude: Math.abs(value), bands, domainMax });
  return {
    roundNumber,
    value,
    direction: directionOf(value),
    layers,
    clipped,
    fromActual,
    reachProbability: point.reachProbability,
    bye: false,
    resolved: point.resolved
  };
}

/**
 * Chart-ready rows on a shared round axis.
 *
 * Columns are the UNION of round numbers across the whole set, not each row's
 * own rounds — a row that is short one round leaves a gap in the right column
 * rather than shifting every wall to its left, which would silently misalign the
 * stack.
 */
export function buildHorizonRows({
  series,
  source = HORIZON_SOURCE.PROJECTED,
  bands = DEFAULT_BANDS,
  domainMax
}: BuildHorizonRowsParams): HorizonRowsResult {
  const roundNumbers = [...new Set(series.flatMap((entry) => entry.points.map((point) => point.roundNumber)))].toSorted(
    (a, b) => a - b
  );

  const resolvedDomain = domainMax ?? resolveHorizonDomain(series, source);

  const rows: HorizonRow[] = series.map((entry) => {
    const byRound = new Map(entry.points.map((point) => [point.roundNumber, point]));
    return {
      participantId: entry.participantId,
      participantName: entry.participantName,
      drawPosition: entry.drawPosition,
      cells: roundNumbers.map((roundNumber) =>
        buildCell({ roundNumber, point: byRound.get(roundNumber), source, bands, domainMax: resolvedDomain })
      )
    };
  });

  return {
    rows,
    roundNumbers,
    domainMax: resolvedDomain,
    bands,
    clippedCells: rows.flatMap((row) => row.cells).filter((cell) => cell.clipped).length
  };
}
