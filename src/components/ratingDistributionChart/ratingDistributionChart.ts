import { scaleLinear, scaleBand, axisBottom, max as d3Max, select } from 'd3';

// constants and types
import { DistributionBin, RatingDistributionStats } from 'tods-competition-factory';

export type RatingDistributionChartMode = 'HISTOGRAM' | 'DONUT';

export interface RatingDistributionChartOptions {
  mode?: RatingDistributionChartMode;
  width?: number;
  height?: number;
  showAxis?: boolean;
  showCounts?: boolean;
  showMean?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
  binColor?: (bin: DistributionBin, index: number) => string;
  ariaLabel?: string;
}

const DEFAULT_HISTOGRAM_WIDTH = 480;
const DEFAULT_HISTOGRAM_HEIGHT = 200;
const DEFAULT_DONUT_SIZE = 280;
const DEFAULT_HISTOGRAM_MARGIN = { top: 12, right: 12, bottom: 28, left: 32 };
const DEFAULT_DONUT_MARGIN = { top: 12, right: 12, bottom: 12, left: 12 };
const DONUT_INNER_RATIO = 0.6;
const DONUT_OUTER_RATIO = 0.9;

const SVG_NS = 'http://www.w3.org/2000/svg';
const TEXT_ANCHOR_MIDDLE = 'middle';
const ATTR_TEXT_ANCHOR = 'text-anchor';
const ATTR_DOMINANT_BASELINE = 'dominant-baseline';

// Color tokens from the courthive-components theme. Each bin pulls
// from the gradient based on its position so the visual flows from
// "low rating" to "high rating" without a hard boundary.
const DEFAULT_BIN_COLORS = ['var(--chc-rating-low, #5b8ff9)', 'var(--chc-rating-high, #00b894)'];

// ============================================================================
// Helpers
// ============================================================================

function createSvg(width: number, height: number, ariaLabel: string | undefined): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'chc-rating-distribution-chart');
  if (ariaLabel) svg.setAttribute('aria-label', ariaLabel);
  return svg;
}

function defaultBinColor(_bin: DistributionBin, index: number, total: number): string {
  if (total <= 1) return DEFAULT_BIN_COLORS[0];
  const t = index / (total - 1);
  // Lazy gradient: alternate the two color tokens by interpolated
  // index so a CSS-variable consumer can re-skin without touching
  // this file.
  return t < 0.5 ? DEFAULT_BIN_COLORS[0] : DEFAULT_BIN_COLORS[1];
}

function resolveBinColor(
  bin: DistributionBin,
  index: number,
  total: number,
  override: RatingDistributionChartOptions['binColor'],
): string {
  if (override) return override(bin, index);
  return defaultBinColor(bin, index, total);
}

function formatBinLabel(bin: DistributionBin): string {
  return `${bin.binStart.toFixed(1)}–${bin.binEnd.toFixed(1)}`;
}

// ============================================================================
// Histogram mode
// ============================================================================

interface HistogramArgs {
  stats: RatingDistributionStats;
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  showAxis: boolean;
  showCounts: boolean;
  showMean: boolean;
  binColor: RatingDistributionChartOptions['binColor'];
  ariaLabel?: string;
}

function renderHistogram(args: HistogramArgs): SVGSVGElement {
  const { stats, width, height, margin, showAxis, showCounts, showMean, binColor, ariaLabel } = args;
  const svg = createSvg(width, height, ariaLabel);
  const inner = select(svg)
    .append('g')
    .attr('class', 'chc-rdc-histogram')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  if (stats.histogram.length === 0 || innerWidth === 0 || innerHeight === 0) return svg;

  const x = scaleBand<string>()
    .domain(stats.histogram.map(formatBinLabel))
    .range([0, innerWidth])
    .padding(0.12);

  const y = scaleLinear()
    .domain([0, d3Max(stats.histogram, (b) => b.count) ?? 0])
    .nice()
    .range([innerHeight, 0]);

  const total = stats.histogram.length;
  inner
    .selectAll('rect.chc-rdc-bar')
    .data(stats.histogram)
    .enter()
    .append('rect')
    .attr('class', 'chc-rdc-bar')
    .attr('x', (b) => x(formatBinLabel(b)) ?? 0)
    .attr('y', (b) => y(b.count))
    .attr('width', x.bandwidth())
    .attr('height', (b) => innerHeight - y(b.count))
    .attr('fill', (b, i) => resolveBinColor(b, i, total, binColor));

  if (showCounts) {
    inner
      .selectAll('text.chc-rdc-count')
      .data(stats.histogram)
      .enter()
      .append('text')
      .attr('class', 'chc-rdc-count')
      .attr('x', (b) => (x(formatBinLabel(b)) ?? 0) + x.bandwidth() / 2)
      .attr('y', (b) => y(b.count) - 4)
      .attr(ATTR_TEXT_ANCHOR, TEXT_ANCHOR_MIDDLE)
      .attr('font-size', '11')
      .text((b) => (b.count > 0 ? String(b.count) : ''));
  }

  if (showAxis) {
    inner
      .append('g')
      .attr('class', 'chc-rdc-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(axisBottom(x).tickSize(0))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('text').attr('font-size', '10').attr('dy', '0.9em'));
  }

  if (showMean && Number.isFinite(stats.mean) && stats.histogram.length > 0) {
    const first = stats.histogram[0];
    const last = stats.histogram.at(-1)!;
    const meanFraction = (stats.mean - first.binStart) / (last.binEnd - first.binStart);
    if (meanFraction >= 0 && meanFraction <= 1) {
      const meanX = meanFraction * innerWidth;
      inner
        .append('line')
        .attr('class', 'chc-rdc-mean')
        .attr('x1', meanX)
        .attr('x2', meanX)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', 'var(--chc-rating-mean, #d63031)')
        .attr('stroke-dasharray', '4 3')
        .attr('stroke-width', 1.5);
    }
  }

  return svg;
}

// ============================================================================
// Donut mode
// ============================================================================

interface DonutArgs {
  stats: RatingDistributionStats;
  size: number;
  margin: { top: number; right: number; bottom: number; left: number };
  showCounts: boolean;
  binColor: RatingDistributionChartOptions['binColor'];
  ariaLabel?: string;
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number): [number, number] {
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
    'Z',
  ].join(' ');
}

function renderDonut(args: DonutArgs): SVGSVGElement {
  const { stats, size, margin, showCounts, binColor, ariaLabel } = args;
  const svg = createSvg(size, size, ariaLabel);

  if (stats.histogram.length === 0 || stats.count === 0) return svg;

  const usableSize = size - Math.max(margin.left + margin.right, margin.top + margin.bottom);
  const radius = usableSize / 2;
  const cx = size / 2;
  const cy = size / 2;
  const outer = radius * DONUT_OUTER_RATIO;
  const inner = radius * DONUT_INNER_RATIO;

  let cursor = 0;
  const total = stats.histogram.length;

  for (let i = 0; i < total; i++) {
    const bin = stats.histogram[i];
    if (bin.count === 0) continue;
    const sweep = (bin.count / stats.count) * 2 * Math.PI;
    const start = cursor;
    const end = cursor + sweep;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'chc-rdc-slice');
    path.setAttribute('d', arcPath(cx, cy, outer, inner, start, end));
    path.setAttribute('fill', resolveBinColor(bin, i, total, binColor));
    svg.appendChild(path);

    if (showCounts) {
      const labelAngle = start + sweep / 2;
      const labelRadius = (outer + inner) / 2;
      const [lx, ly] = polarToCartesian(cx, cy, labelRadius, labelAngle);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', 'chc-rdc-slice-label');
      text.setAttribute('x', String(lx));
      text.setAttribute('y', String(ly));
      text.setAttribute(ATTR_TEXT_ANCHOR, TEXT_ANCHOR_MIDDLE);
      text.setAttribute(ATTR_DOMINANT_BASELINE, TEXT_ANCHOR_MIDDLE);
      text.setAttribute('font-size', '11');
      text.setAttribute('fill', 'var(--chc-rating-label, #2d3436)');
      text.textContent = String(bin.count);
      svg.appendChild(text);
    }

    cursor = end;
  }

  // Center label — total participant count
  const centerText = document.createElementNS(SVG_NS, 'text');
  centerText.setAttribute('class', 'chc-rdc-center-count');
  centerText.setAttribute('x', String(cx));
  centerText.setAttribute('y', String(cy));
  centerText.setAttribute(ATTR_TEXT_ANCHOR, TEXT_ANCHOR_MIDDLE);
  centerText.setAttribute(ATTR_DOMINANT_BASELINE, TEXT_ANCHOR_MIDDLE);
  centerText.setAttribute('font-size', '20');
  centerText.setAttribute('font-weight', '600');
  centerText.textContent = String(stats.count);
  svg.appendChild(centerText);

  return svg;
}

// ============================================================================
// Public entry
// ============================================================================

// Builds an SVG visualization of a participant rating distribution.
// Two modes are supported:
//   - HISTOGRAM (default): vertical bars per bin, optional axis and
//     mean line, count labels above each bar.
//   - DONUT: circular slices sized by bin count, with the total
//     participant count rendered in the center.
//
// The component is purely presentational — no interactivity in
// Phase 1.B. Click / hover behavior is owned by the wizard modal in
// the consuming TMX layer (Phase 1.C).
export function buildRatingDistributionChart(
  stats: RatingDistributionStats,
  options: RatingDistributionChartOptions = {},
): SVGSVGElement {
  const mode = options.mode ?? 'HISTOGRAM';
  const ariaLabel = options.ariaLabel ?? 'Participant rating distribution';

  if (mode === 'DONUT') {
    const size = options.width ?? options.height ?? DEFAULT_DONUT_SIZE;
    return renderDonut({
      stats,
      size,
      margin: options.margin ?? DEFAULT_DONUT_MARGIN,
      showCounts: options.showCounts ?? true,
      binColor: options.binColor,
      ariaLabel,
    });
  }

  return renderHistogram({
    stats,
    width: options.width ?? DEFAULT_HISTOGRAM_WIDTH,
    height: options.height ?? DEFAULT_HISTOGRAM_HEIGHT,
    margin: options.margin ?? DEFAULT_HISTOGRAM_MARGIN,
    showAxis: options.showAxis ?? true,
    showCounts: options.showCounts ?? true,
    showMean: options.showMean ?? true,
    binColor: options.binColor,
    ariaLabel,
  });
}
