import { donutModel, histogramModel } from './chartModel';
import { axisBottom, select } from 'd3';

// constants and types
import type { DistributionBin, RatingDistributionStats } from 'tods-competition-factory';
import type { Margin } from './chartModel';

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

const SVG_NS = 'http://www.w3.org/2000/svg';
const TEXT_ANCHOR_MIDDLE = 'middle';
const ATTR_TEXT_ANCHOR = 'text-anchor';
const ATTR_DOMINANT_BASELINE = 'dominant-baseline';

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

// ============================================================================
// Histogram mode
// ============================================================================

interface HistogramArgs {
  stats: RatingDistributionStats;
  width: number;
  height: number;
  margin: Margin;
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

  const model = histogramModel({ stats, width, height, margin, binColor, showMean });
  if (!model) return svg;
  const { innerHeight, x, meanX } = model;

  const bars = inner
    .selectAll('rect.chc-rdc-bar')
    .data(model.bars)
    .enter()
    .append('rect')
    .attr('class', 'chc-rdc-bar')
    .attr('x', (b) => b.x)
    .attr('y', (b) => b.y)
    .attr('width', (b) => b.width)
    .attr('height', (b) => b.height)
    .attr('fill', (b) => b.fill);

  // Native SVG <title> child becomes a browser tooltip on hover. Cheap
  // accessible alternative to a custom popover, and the bin range never
  // overlaps the axis even when many bins compress the chart width.
  bars.append('title').text((b) => b.title);

  if (showCounts) {
    inner
      .selectAll('text.chc-rdc-count')
      .data(model.bars)
      .enter()
      .append('text')
      .attr('class', 'chc-rdc-count')
      .attr('x', (b) => b.countX)
      .attr('y', (b) => b.countY)
      .attr(ATTR_TEXT_ANCHOR, TEXT_ANCHOR_MIDDLE)
      .attr('font-size', '11')
      .attr('fill', 'var(--chc-rdc-count-color, var(--chc-text-primary))')
      .text((b) => b.countText);
  }

  if (showAxis) {
    inner
      .append('g')
      .attr('class', 'chc-rdc-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(axisBottom(x).tickValues(model.tickValues).tickSize(0))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('text').attr('font-size', '10').attr('dy', '0.9em'));
  }

  if (meanX !== undefined) {
    inner
      .append('line')
      .attr('class', 'chc-rdc-mean')
      .attr('x1', meanX)
      .attr('x2', meanX)
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', 'var(--chc-rating-mean, var(--chc-accent-red))')
      .attr('stroke-dasharray', '4 3')
      .attr('stroke-width', 1.5);
  }

  return svg;
}

// ============================================================================
// Donut mode
// ============================================================================

interface DonutArgs {
  stats: RatingDistributionStats;
  size: number;
  margin: Margin;
  showCounts: boolean;
  binColor: RatingDistributionChartOptions['binColor'];
  ariaLabel?: string;
}

function renderDonut(args: DonutArgs): SVGSVGElement {
  const { stats, size, margin, showCounts, binColor, ariaLabel } = args;
  const svg = createSvg(size, size, ariaLabel);

  const model = donutModel({ stats, size, margin, binColor });
  if (!model) return svg;

  for (const slice of model.slices) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'chc-rdc-slice');
    path.setAttribute('d', slice.d);
    path.setAttribute('fill', slice.fill);
    svg.appendChild(path);

    if (showCounts) {
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', 'chc-rdc-slice-label');
      text.setAttribute('x', String(slice.labelX));
      text.setAttribute('y', String(slice.labelY));
      text.setAttribute(ATTR_TEXT_ANCHOR, TEXT_ANCHOR_MIDDLE);
      text.setAttribute(ATTR_DOMINANT_BASELINE, TEXT_ANCHOR_MIDDLE);
      text.setAttribute('font-size', '11');
      text.setAttribute('fill', 'var(--chc-rating-label, var(--chc-text-primary))');
      text.textContent = slice.labelText;
      svg.appendChild(text);
    }
  }

  // Center label — total participant count
  const centerText = document.createElementNS(SVG_NS, 'text');
  centerText.setAttribute('class', 'chc-rdc-center-count');
  centerText.setAttribute('x', String(model.cx));
  centerText.setAttribute('y', String(model.cy));
  centerText.setAttribute(ATTR_TEXT_ANCHOR, TEXT_ANCHOR_MIDDLE);
  centerText.setAttribute(ATTR_DOMINANT_BASELINE, TEXT_ANCHOR_MIDDLE);
  centerText.setAttribute('font-size', '20');
  centerText.setAttribute('font-weight', '600');
  centerText.textContent = model.centerText;
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
  options: RatingDistributionChartOptions = {}
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
      ariaLabel
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
    ariaLabel
  });
}
