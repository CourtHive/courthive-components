import { scaleLinear, scaleBand, max as d3Max } from 'd3';

// constants and types
import type { DistributionBin, RatingDistributionStats } from 'tods-competition-factory';
import type { ScaleBand } from 'd3';

/**
 * The geometry and labels of a rating distribution chart, computed without a DOM. `ratingDistributionChart`
 * draws exactly what these return; everything here is in the chart's own SVG user units.
 */

export type Margin = { top: number; right: number; bottom: number; left: number };
export type BinColor = (bin: DistributionBin, index: number) => string;

const DONUT_INNER_RATIO = 0.6;
const DONUT_OUTER_RATIO = 0.9;
/** Bin labels read as "12.5–13.0", ~55 px wide at font-size 10. */
const MIN_PX_PER_LABEL = 55;

// Color tokens from the courthive-components theme. Each bin pulls
// from the gradient based on its position so the visual flows from
// "low rating" to "high rating" without a hard boundary.
const DEFAULT_BIN_COLORS = [
  'var(--chc-rating-low, var(--chc-accent-blue))',
  'var(--chc-rating-high, var(--chc-accent-teal))'
];

function defaultBinColor(index: number, total: number): string {
  if (total <= 1) return DEFAULT_BIN_COLORS[0];
  const t = index / (total - 1);
  // Lazy gradient: alternate the two color tokens by interpolated
  // index so a CSS-variable consumer can re-skin without touching
  // this file.
  return t < 0.5 ? DEFAULT_BIN_COLORS[0] : DEFAULT_BIN_COLORS[1];
}

export function resolveBinColor(bin: DistributionBin, index: number, total: number, override?: BinColor): string {
  if (override) return override(bin, index);
  return defaultBinColor(index, total);
}

export function formatBinLabel(bin: DistributionBin): string {
  return `${bin.binStart.toFixed(1)}–${bin.binEnd.toFixed(1)}`;
}

// ============================================================================
// Histogram
// ============================================================================

export interface HistogramBar {
  bin: DistributionBin;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  /** The bar's hover title. */
  title: string;
  /** The count above the bar: `''` for an empty bin, so a zero draws no label. */
  countText: string;
  countX: number;
  countY: number;
}

export interface HistogramModel {
  innerWidth: number;
  innerHeight: number;
  x: ScaleBand<string>;
  bars: HistogramBar[];
  /** Every bin label when they all fit, else just the first and last as range anchors. */
  tickValues: string[];
  /** The mean line's x, or undefined when it is off, not finite, or outside the bins' range. */
  meanX: number | undefined;
}

/** Undefined when there is nothing to draw: no bins, or no room inside the margins. */
export function histogramModel({
  binColor,
  showMean,
  margin,
  height,
  width,
  stats
}: {
  binColor?: BinColor;
  showMean: boolean;
  margin: Margin;
  height: number;
  width: number;
  stats: RatingDistributionStats;
}): HistogramModel | undefined {
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  const { histogram } = stats;
  if (histogram.length === 0 || innerWidth === 0 || innerHeight === 0) return undefined;

  const labels = histogram.map(formatBinLabel);
  const x = scaleBand<string>().domain(labels).range([0, innerWidth]).padding(0.12);
  const y = scaleLinear()
    .domain([0, d3Max(histogram, (b) => b.count) ?? 0])
    .nice()
    .range([innerHeight, 0]);

  const total = histogram.length;
  const bars = histogram.map((bin, index) => {
    const label = labels[index];
    const barX = x(label) ?? 0;
    return {
      bin,
      label,
      x: barX,
      y: y(bin.count),
      width: x.bandwidth(),
      height: innerHeight - y(bin.count),
      fill: resolveBinColor(bin, index, total, binColor),
      title: `${label}: ${bin.count}`,
      countText: bin.count > 0 ? String(bin.count) : '',
      countX: barX + x.bandwidth() / 2,
      countY: y(bin.count) - 4
    };
  });

  // When bins compress below a label's width, every label rendered = overlap soup; per-bin precision
  // comes from the hover <title> on each bar instead.
  const fitsAll = innerWidth / total >= MIN_PX_PER_LABEL;
  const tickValues = fitsAll ? labels : [labels[0], labels.at(-1)!].filter((v, i, a) => a.indexOf(v) === i);

  let meanX: number | undefined;
  if (showMean && Number.isFinite(stats.mean)) {
    const first = histogram[0];
    const last = histogram.at(-1)!;
    const meanFraction = (stats.mean - first.binStart) / (last.binEnd - first.binStart);
    if (meanFraction >= 0 && meanFraction <= 1) meanX = meanFraction * innerWidth;
  }

  return { innerWidth, innerHeight, x, bars, tickValues, meanX };
}

// ============================================================================
// Donut
// ============================================================================

export function polarToCartesian(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
}

function arcPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number): string {
  const [outerStartX, outerStartY] = polarToCartesian(cx, cy, outer, start);
  const [outerEndX, outerEndY] = polarToCartesian(cx, cy, outer, end);
  const [innerStartX, innerStartY] = polarToCartesian(cx, cy, inner, end);
  const [innerEndX, innerEndY] = polarToCartesian(cx, cy, inner, start);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}`,
    `L ${innerStartX} ${innerStartY}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${innerEndX} ${innerEndY}`,
    'Z'
  ].join(' ');
}

export interface DonutSlice {
  bin: DistributionBin;
  /** Angles in radians, clockwise from 12 o'clock. */
  start: number;
  end: number;
  d: string;
  fill: string;
  labelText: string;
  labelX: number;
  labelY: number;
}

export interface DonutModel {
  cx: number;
  cy: number;
  outer: number;
  inner: number;
  /** One per NON-EMPTY bin: a zero-count bin has no slice. */
  slices: DonutSlice[];
  /** The total participant count, drawn in the centre. */
  centerText: string;
}

/** Undefined when there is nothing to draw: no bins, or a zero count. */
export function donutModel({
  binColor,
  margin,
  stats,
  size
}: {
  binColor?: BinColor;
  margin: Margin;
  stats: RatingDistributionStats;
  size: number;
}): DonutModel | undefined {
  const { histogram, count } = stats;
  if (histogram.length === 0 || count === 0) return undefined;

  const usableSize = size - Math.max(margin.left + margin.right, margin.top + margin.bottom);
  const radius = usableSize / 2;
  const cx = size / 2;
  const cy = size / 2;
  const outer = radius * DONUT_OUTER_RATIO;
  const inner = radius * DONUT_INNER_RATIO;
  const labelRadius = (outer + inner) / 2;

  let cursor = 0;
  const total = histogram.length;
  const slices: DonutSlice[] = [];
  histogram.forEach((bin, index) => {
    if (bin.count === 0) return;
    const sweep = (bin.count / count) * 2 * Math.PI;
    const start = cursor;
    const end = cursor + sweep;
    const [labelX, labelY] = polarToCartesian(cx, cy, labelRadius, start + sweep / 2);
    slices.push({
      bin,
      start,
      end,
      d: arcPath(cx, cy, outer, inner, start, end),
      fill: resolveBinColor(bin, index, total, binColor),
      labelText: String(bin.count),
      labelX,
      labelY
    });
    cursor = end;
  });

  return { cx, cy, outer, inner, slices, centerText: String(count) };
}
