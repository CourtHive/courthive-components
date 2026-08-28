/**
 * Pressure chart — one participant's projected vs actual path difficulty.
 *
 * ONE y-axis: signed rating delta (opponent minus own), zero = an even match,
 * above the line = playing up. The two measures the chart carries are put on
 * different CHANNELS rather than two scales:
 *
 *   y position  -> how hard the opponent was / is projected to be
 *   marker fill -> how close the scoreline actually was
 *
 * A dual-axis version of this chart would be the obvious design and it would be
 * wrong; see `buildPressureSeries`.
 *
 * The projected band narrows round by round as the draw resolves and collapses
 * to a point once the opponent is known — the uncertainty visibly burning off is
 * the most legible thing here, so it is drawn first and lowest.
 */

import { scaleLinear, line as d3Line, area as d3Area, select } from 'd3';
import { competitivenessColor } from '../burstChart/competitiveness';

// constants and types
import type { CompetitivenessBucket } from '../competitivenessBar/types';
import type { PressureSeries, PressureSeriesPoint } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ATTR_TEXT_ANCHOR = 'text-anchor';
const ATTR_DOMINANT_BASELINE = 'dominant-baseline';
const CLASS_ATTR = 'class';
const MIDDLE = 'middle';

const DEFAULT_WIDTH = 520;
const DEFAULT_HEIGHT = 240;
const DEFAULT_MARGIN = { top: 16, right: 64, bottom: 28, left: 44 };
const MARKER_RADIUS = 5;
const SPARK_MARKER_RADIUS = 3;

export type PressureChartOptions = {
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  /** Compact mode for the small-multiples grid: no labels, no legend, thin marks. */
  spark?: boolean;
  /** Fix the y domain across a set of charts so small multiples are comparable. */
  yDomain?: [number, number];
  /** Label for the rating scale, e.g. 'WTN'. Shown on the axis. */
  scaleName?: string;
  showLegend?: boolean;
  ariaLabel?: string;
  roundLabels?: (roundNumber: number, index: number, total: number) => string;
  emptyMessage?: string;
};

export type PressureChartInstance = {
  element: HTMLElement;
  update: (series: PressureSeries | undefined, options?: PressureChartOptions) => void;
  destroy: () => void;
};

/** QF / SF / F for the last three rounds, R1.. before that — matches the round-nav convention. */
export function defaultRoundLabel(_roundNumber: number, index: number, total: number): string {
  const fromEnd = total - index;
  if (total >= 3) {
    if (fromEnd === 1) return 'F';
    if (fromEnd === 2) return 'SF';
    if (fromEnd === 3) return 'QF';
  }
  return `R${index + 1}`;
}

function createElementNS(tag: string, className?: string): SVGElement {
  const element = document.createElementNS(SVG_NS, tag);
  if (className) element.setAttribute(CLASS_ATTR, className);
  return element;
}

function signed(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

/** Symmetric domain around zero so "playing up" and "playing down" read equally. */
export function resolveYDomain(points: PressureSeriesPoint[], override?: [number, number]): [number, number] {
  if (override) return override;
  const values: number[] = [];
  for (const point of points) {
    for (const candidate of [point.projected.expected, point.projected.low, point.projected.high, point.actual]) {
      if (candidate !== null && candidate !== undefined) values.push(candidate);
    }
  }
  if (!values.length) return [-100, 100];
  const extent = Math.max(Math.abs(Math.min(...values)), Math.abs(Math.max(...values)), 50);
  const padded = extent * 1.15;
  return [-padded, padded];
}

type Geometry = {
  x: (index: number) => number;
  y: (value: number) => number;
  yDomain: [number, number];
  innerWidth: number;
  innerHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
};

function buildGeometry(points: PressureSeriesPoint[], options: PressureChartOptions): Geometry {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const margin = options.margin ?? (options.spark ? { top: 6, right: 6, bottom: 6, left: 6 } : DEFAULT_MARGIN);
  const innerWidth = Math.max(1, width - margin.left - margin.right);
  const innerHeight = Math.max(1, height - margin.top - margin.bottom);
  const xScale = scaleLinear()
    .domain([0, Math.max(1, points.length - 1)])
    .range([0, innerWidth]);
  const yDomain = resolveYDomain(points, options.yDomain);
  const yScale = scaleLinear().domain(yDomain).range([innerHeight, 0]);
  return { x: (index) => xScale(index), y: (value) => yScale(value), yDomain, innerWidth, innerHeight, margin };
}

function appendBand(group: SVGElement, points: PressureSeriesPoint[], geometry: Geometry): void {
  const banded = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.projected.low !== null && point.projected.high !== null);
  if (banded.length < 2) return;

  const areaGenerator = d3Area<{ point: PressureSeriesPoint; index: number }>()
    .x(({ index }) => geometry.x(index))
    .y0(({ point }) => geometry.y(point.projected.low as number))
    .y1(({ point }) => geometry.y(point.projected.high as number));

  const path = createElementNS('path', 'chc-pc__band');
  path.setAttribute('d', areaGenerator(banded) ?? '');
  group.appendChild(path);
}

function appendLine({
  group,
  points,
  geometry,
  className,
  accessor
}: {
  group: SVGElement;
  points: PressureSeriesPoint[];
  geometry: Geometry;
  className: string;
  accessor: (point: PressureSeriesPoint) => number | null;
}): void {
  const defined = points.map((point, index) => ({ point, index })).filter(({ point }) => accessor(point) !== null);
  if (defined.length < 2) return;
  const lineGenerator = d3Line<{ point: PressureSeriesPoint; index: number }>()
    .x(({ index }) => geometry.x(index))
    .y(({ point }) => geometry.y(accessor(point) as number));
  const path = createElementNS('path', className);
  path.setAttribute('d', lineGenerator(defined) ?? '');
  group.appendChild(path);
}

function markerFill(competitiveness: CompetitivenessBucket | undefined): string {
  return competitivenessColor(competitiveness);
}

function appendMarkers({
  group,
  points,
  geometry,
  radius,
  onHover
}: {
  group: SVGElement;
  points: PressureSeriesPoint[];
  geometry: Geometry;
  radius: number;
  onHover?: (point: PressureSeriesPoint, index: number, event: MouseEvent) => void;
}): void {
  points.forEach((point, index) => {
    if (point.actual === null) return;
    const marker = createElementNS(
      'circle',
      point.won === false ? 'chc-pc__marker chc-pc__marker--lost' : 'chc-pc__marker'
    );
    marker.setAttribute('cx', String(geometry.x(index)));
    marker.setAttribute('cy', String(geometry.y(point.actual)));
    marker.setAttribute('r', String(radius));
    marker.setAttribute('fill', markerFill(point.competitiveness));
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = `Round ${point.roundNumber}: ${signed(point.actual)} · ${point.competitiveness ?? 'unclassified'}`;
    marker.appendChild(title);
    if (onHover) {
      // Hit target larger than the mark.
      marker.addEventListener('mouseenter', (event) => onHover(point, index, event as MouseEvent));
      marker.addEventListener('mousemove', (event) => onHover(point, index, event as MouseEvent));
    }
    group.appendChild(marker);
  });
}

/**
 * A magnitude chart with no numbers on the axis is a shape, not a measurement.
 * Two labelled gridlines either side of the zero line are enough to tell a
 * 50-point gap from a 500-point one without turning the plot into a grid.
 */
function appendYTicks({ group, geometry }: { group: SVGElement; geometry: Geometry }): void {
  const [min, max] = geometry.yDomain;
  const step = niceStep(Math.max(Math.abs(min), Math.abs(max)));
  for (const value of [-step, step]) {
    if (value < min || value > max) continue;
    const gridline = createElementNS('line', 'chc-pc__tick');
    gridline.setAttribute('x1', '0');
    gridline.setAttribute('x2', String(geometry.innerWidth));
    gridline.setAttribute('y1', String(geometry.y(value)));
    gridline.setAttribute('y2', String(geometry.y(value)));
    group.appendChild(gridline);

    const label = createElementNS('text', 'chc-pc__tick-label');
    label.setAttribute('x', '-6');
    label.setAttribute('y', String(geometry.y(value)));
    label.setAttribute(ATTR_TEXT_ANCHOR, 'end');
    label.setAttribute(ATTR_DOMINANT_BASELINE, MIDDLE);
    label.textContent = signed(value);
    group.appendChild(label);
  }
}

/** Round a half-extent down to a readable 1 / 2 / 5 x 10^n step. */
export function niceStep(extent: number): number {
  if (!Number.isFinite(extent) || extent <= 0) return 1;
  const target = extent / 2;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const stepped = (normalized >= 5 && 5) || (normalized >= 2 && 2) || 1;
  return stepped * magnitude;
}

function appendAxes({
  group,
  points,
  geometry,
  options
}: {
  group: SVGElement;
  points: PressureSeriesPoint[];
  geometry: Geometry;
  options: PressureChartOptions;
}): void {
  const zero = createElementNS('line', 'chc-pc__zero');
  zero.setAttribute('x1', '0');
  zero.setAttribute('x2', String(geometry.innerWidth));
  zero.setAttribute('y1', String(geometry.y(0)));
  zero.setAttribute('y2', String(geometry.y(0)));
  group.appendChild(zero);

  if (options.spark) return;

  appendYTicks({ group, geometry });

  const zeroLabel = createElementNS('text', 'chc-pc__axis-label');
  zeroLabel.setAttribute('x', String(geometry.innerWidth + 6));
  zeroLabel.setAttribute('y', String(geometry.y(0)));
  zeroLabel.setAttribute(ATTR_DOMINANT_BASELINE, MIDDLE);
  zeroLabel.textContent = 'even';
  group.appendChild(zeroLabel);

  const label = options.roundLabels ?? defaultRoundLabel;
  points.forEach((point, index) => {
    const text = createElementNS('text', 'chc-pc__round-label');
    text.setAttribute('x', String(geometry.x(index)));
    text.setAttribute('y', String(geometry.innerHeight + 16));
    text.setAttribute(ATTR_TEXT_ANCHOR, MIDDLE);
    text.textContent = label(point.roundNumber, index, points.length);
    group.appendChild(text);

    if (point.bye) {
      const bye = createElementNS('text', 'chc-pc__bye');
      bye.setAttribute('x', String(geometry.x(index)));
      bye.setAttribute('y', String(geometry.y(0) - 8));
      bye.setAttribute(ATTR_TEXT_ANCHOR, MIDDLE);
      bye.textContent = 'bye';
      group.appendChild(bye);
    }
  });

  const scaleLabel = createElementNS('text', 'chc-pc__axis-label');
  scaleLabel.setAttribute('x', '0');
  scaleLabel.setAttribute('y', '-4');
  scaleLabel.textContent = options.scaleName
    ? `opponent strength vs own (${options.scaleName}, ELO-equivalent)`
    : 'opponent strength vs own';
  group.appendChild(scaleLabel);
}

/**
 * Direct labels on both series — with only two, identity never rests on colour
 * alone even before the legend is read.
 */
function appendSeriesLabels({
  group,
  points,
  geometry
}: {
  group: SVGElement;
  points: PressureSeriesPoint[];
  geometry: Geometry;
}): void {
  const lastProjected = [...points].reverse().find((point) => point.projected.expected !== null);
  const lastActual = [...points].reverse().find((point) => point.actual !== null);

  if (lastProjected) {
    const index = points.indexOf(lastProjected);
    const text = createElementNS('text', 'chc-pc__series-label');
    text.setAttribute('x', String(geometry.x(index) + 8));
    text.setAttribute('y', String(geometry.y(lastProjected.projected.expected as number)));
    text.setAttribute(ATTR_DOMINANT_BASELINE, MIDDLE);
    text.setAttribute('fill', 'var(--chc-pc-projected)');
    text.textContent = 'projected';
    group.appendChild(text);
  }

  if (lastActual) {
    const index = points.indexOf(lastActual);
    // A series eliminated before the last round ends mid-plot, where the label
    // would sit on top of the projected line. Lift it clear and let the halo in
    // the stylesheet handle whatever still overlaps.
    const eliminatedEarly = index < points.length - 1;
    const text = createElementNS('text', 'chc-pc__series-label');
    text.setAttribute('x', String(geometry.x(index) + 8));
    text.setAttribute('y', String(geometry.y(lastActual.actual as number) + (eliminatedEarly ? -12 : 0)));
    text.setAttribute(ATTR_DOMINANT_BASELINE, MIDDLE);
    text.textContent = 'actual';
    group.appendChild(text);
  }
}

function buildLegend(): HTMLElement {
  const legend = document.createElement('div');
  legend.className = 'chc-pc__legend';
  const entries: [string, string][] = [
    ['chc-pc__legend-swatch chc-pc__legend-swatch--band', 'possible opponents'],
    ['chc-pc__legend-swatch chc-pc__legend-swatch--projected', 'projected'],
    ['chc-pc__legend-swatch chc-pc__legend-swatch--line', 'actual']
  ];
  for (const [className, label] of entries) {
    const item = document.createElement('span');
    item.className = 'chc-pc__legend-item';
    const swatch = document.createElement('span');
    swatch.className = className;
    item.append(swatch, document.createTextNode(label));
    legend.appendChild(item);
  }
  for (const bucket of ['COMPETITIVE', 'ROUTINE', 'DECISIVE'] as CompetitivenessBucket[]) {
    const item = document.createElement('span');
    item.className = 'chc-pc__legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'chc-pc__legend-swatch';
    swatch.style.background = competitivenessColor(bucket);
    item.append(swatch, document.createTextNode(bucket.toLowerCase()));
    legend.appendChild(item);
  }
  return legend;
}

function buildTooltip(): HTMLElement {
  const tooltip = document.createElement('div');
  tooltip.className = 'chc-pc__tooltip';
  tooltip.dataset.visible = 'false';
  return tooltip;
}

function tooltipRow(label: string, value: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'chc-pc__tooltip-row';
  const left = document.createElement('span');
  left.textContent = label;
  const right = document.createElement('span');
  right.textContent = value;
  row.append(left, right);
  return row;
}

function fillTooltip(tooltip: HTMLElement, point: PressureSeriesPoint): void {
  tooltip.replaceChildren();
  const title = document.createElement('div');
  title.className = 'chc-pc__tooltip-title';
  title.textContent = `Round ${point.roundNumber}`;
  tooltip.appendChild(title);
  if (point.actual !== null) tooltip.appendChild(tooltipRow('faced', signed(point.actual)));
  if (point.competitiveness) tooltip.appendChild(tooltipRow('scoreline', point.competitiveness.toLowerCase()));
  if (point.won !== undefined) tooltip.appendChild(tooltipRow('result', point.won ? 'won' : 'lost'));
  if (point.projected.expected !== null) {
    tooltip.appendChild(tooltipRow('projected', signed(point.projected.expected)));
  }
  if (point.projected.low !== null && point.projected.high !== null) {
    tooltip.appendChild(tooltipRow('range', `${signed(point.projected.low)} … ${signed(point.projected.high)}`));
  }
  tooltip.appendChild(tooltipRow('reach', `${Math.round(point.reachProbability * 100)}%`));
}

function emptyState(message: string): HTMLElement {
  const empty = document.createElement('div');
  empty.className = 'chc-pc__empty';
  empty.textContent = message;
  return empty;
}

/**
 * Build (or rebuild) the chart into a container.
 *
 * Returns a handle so a consumer can re-render on a live update without
 * re-querying the DOM. `update(undefined)` renders the empty state — an unrated
 * field is a legitimate outcome, not an error.
 */
export function buildPressureChart(
  container: HTMLElement,
  series?: PressureSeries,
  options: PressureChartOptions = {}
): PressureChartInstance {
  const root = document.createElement('div');
  root.className = 'chc-pc';
  container.appendChild(root);

  const tooltip = buildTooltip();

  function render(current: PressureSeries | undefined, currentOptions: PressureChartOptions): void {
    root.replaceChildren();
    const points = current?.points ?? [];
    if (!current || !points.length || !current.rating) {
      root.appendChild(
        emptyState(currentOptions.emptyMessage ?? 'No rating data for this draw, so no pressure to plot.')
      );
      return;
    }

    const width = currentOptions.width ?? DEFAULT_WIDTH;
    const height = currentOptions.height ?? DEFAULT_HEIGHT;
    const geometry = buildGeometry(points, currentOptions);

    const svg = createElementNS('svg', 'chc-pc__svg') as SVGSVGElement;
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute(
      'aria-label',
      currentOptions.ariaLabel ??
        `Projected and actual opponent difficulty by round for ${current.participantName ?? current.participantId}`
    );

    const group = createElementNS('g');
    group.setAttribute('transform', `translate(${geometry.margin.left}, ${geometry.margin.top})`);
    svg.appendChild(group);

    appendBand(group, points, geometry);
    appendAxes({ group, points, geometry, options: currentOptions });
    appendLine({
      group,
      points,
      geometry,
      className: 'chc-pc__projected-line',
      accessor: (point) => point.projected.expected
    });
    appendLine({ group, points, geometry, className: 'chc-pc__actual-line', accessor: (point) => point.actual });
    appendMarkers({
      group,
      points,
      geometry,
      radius: currentOptions.spark ? SPARK_MARKER_RADIUS : MARKER_RADIUS,
      onHover: currentOptions.spark
        ? undefined
        : (point, _index, event) => {
            fillTooltip(tooltip, point);
            tooltip.dataset.visible = 'true';
            tooltip.style.left = `${event.offsetX + 12}px`;
            tooltip.style.top = `${event.offsetY + 12}px`;
          }
    });
    if (!currentOptions.spark) appendSeriesLabels({ group, points, geometry });

    root.appendChild(svg);
    if (!currentOptions.spark) {
      root.appendChild(tooltip);
      if (currentOptions.showLegend !== false) root.appendChild(buildLegend());
      root.addEventListener('mouseleave', () => {
        tooltip.dataset.visible = 'false';
      });
    }
  }

  render(series, options);

  return {
    element: root,
    update: (next, nextOptions) => render(next, { ...options, ...nextOptions }),
    destroy: () => {
      select(root).remove();
    }
  };
}
