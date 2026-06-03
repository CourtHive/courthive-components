/**
 * LadderChart — D3v7 implementation.
 *
 * Modern TypeScript port of the legacy tennisvisuals `ladderChart` D3v3
 * visualization. Renders a player's ordinal finishing-position progression
 * over time: X = date, Y = ordinal rung (e.g. R128 → R64 → … → W),
 * marks at each tournament, connected by a step-after line.
 *
 * Vanilla-component pattern: caller passes a container HTMLElement and
 * a config object; receives back a `LadderChartInstance` with `update()`
 * and `destroy()`. No framework / no global state.
 */

import {
  axisBottom,
  axisLeft,
  curveStepAfter,
  extent as d3Extent,
  line as d3Line,
  scalePoint,
  scaleTime,
  select,
  timeFormat,
} from 'd3';

import './ladderChart.css';
import type { LadderChartConfig, LadderChartInstance, LadderChartMargins } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

const DEFAULT_MARGINS: Required<LadderChartMargins> = { top: 36, right: 16, bottom: 28, left: 56 };
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 260;
const DEFAULT_MARK_RADIUS = 6;
const DEFAULT_X_MAX_TICKS = 8;

interface InternalState {
  container: HTMLElement;
  svg: SVGSVGElement;
  config: Required<Pick<LadderChartConfig, 'rungs' | 'data'>> & LadderChartConfig;
  destroyed: boolean;
}

export function buildLadderChart(container: HTMLElement, initialConfig: LadderChartConfig): LadderChartInstance {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.classList.add('lc-svg');
  container.appendChild(svg);

  const state: InternalState = {
    container,
    svg,
    config: { ...initialConfig },
    destroyed: false,
  };

  render(state);

  return {
    element: svg,
    update(next: Partial<LadderChartConfig>) {
      if (state.destroyed) return;
      state.config = { ...state.config, ...next };
      render(state);
    },
    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      if (svg.parentNode === container) container.removeChild(svg);
    },
  };
}

function render(state: InternalState): void {
  const { svg, container, config } = state;
  const margins: Required<LadderChartMargins> = { ...DEFAULT_MARGINS, ...(config.margins || {}) };

  const containerWidth = container.clientWidth || DEFAULT_WIDTH;
  const width = config.width ?? containerWidth;
  const height = config.height ?? DEFAULT_HEIGHT;

  // Reset the SVG fresh on each render. Simpler than diffing for this size
  // of chart; the legacy code did the same via .remove() + .append() of
  // groups inside selection.each().
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const plotWidth = Math.max(0, width - margins.left - margins.right);
  const plotHeight = Math.max(0, height - margins.top - margins.bottom);

  // Normalize data: parse string dates; clamp rung within bounds; sort by date.
  const normalized = (config.data || [])
    .map((d) => ({
      ...d,
      _dateValue: d.date instanceof Date ? d.date : new Date(d.date),
      _rung: Math.max(0, Math.min(config.rungs.length - 1, d.rung)),
    }))
    .filter((d) => !Number.isNaN(d._dateValue.getTime()))
    .sort((a, b) => a._dateValue.getTime() - b._dateValue.getTime());

  // Title
  if (config.title) {
    const title = document.createElementNS(SVG_NS, 'text');
    title.setAttribute('class', 'lc-title');
    title.setAttribute('x', String(margins.left));
    title.setAttribute('y', String(Math.max(16, margins.top - 12)));
    title.textContent = config.title;
    svg.appendChild(title);
  }

  // Empty state
  if (!normalized.length) {
    const empty = document.createElementNS(SVG_NS, 'text');
    empty.setAttribute('class', 'lc-empty');
    empty.setAttribute('x', String(width / 2));
    empty.setAttribute('y', String(height / 2));
    empty.setAttribute('text-anchor', 'middle');
    empty.textContent = 'No data';
    svg.appendChild(empty);
    return;
  }

  // ── Scales ──────────────────────────────────────────────────────────
  // Pad the date domain a small fraction so the leftmost/rightmost marks
  // aren't clipped by the axis line.
  const dateExtent = d3Extent(normalized, (d) => d._dateValue) as [Date, Date];
  const padDays = Math.max(
    3,
    (dateExtent[1].getTime() - dateExtent[0].getTime()) / (1000 * 60 * 60 * 24) * 0.04
  );
  const paddedStart = new Date(dateExtent[0].getTime() - padDays * 86400_000);
  const paddedEnd = new Date(dateExtent[1].getTime() + padDays * 86400_000);

  const xScale = scaleTime()
    .domain([paddedStart, paddedEnd])
    .range([0, plotWidth]);

  // scalePoint distributes ordinal labels evenly along the Y range; bottom
  // rung (index 0) maps to the bottom of the plot, top rung to the top.
  const yScale = scalePoint<string>()
    .domain([...config.rungs].reverse()) // visually: top rung at top
    .range([0, plotHeight])
    .padding(0.5);

  const plotGroup = document.createElementNS(SVG_NS, 'g');
  plotGroup.setAttribute('transform', `translate(${margins.left},${margins.top})`);
  svg.appendChild(plotGroup);

  // ── Y axis (rung labels) ───────────────────────────────────────────
  const yAxisGroup = document.createElementNS(SVG_NS, 'g');
  yAxisGroup.setAttribute('class', 'lc-axis lc-axis-y');
  plotGroup.appendChild(yAxisGroup);
  select(yAxisGroup).call(
    axisLeft<string>(yScale)
      .tickSize(-plotWidth)
      .tickPadding(8)
  );

  // ── X axis (dates) ─────────────────────────────────────────────────
  const xAxisGroup = document.createElementNS(SVG_NS, 'g');
  xAxisGroup.setAttribute('class', 'lc-axis lc-axis-x');
  xAxisGroup.setAttribute('transform', `translate(0,${plotHeight})`);
  plotGroup.appendChild(xAxisGroup);

  const yearSpan = (dateExtent[1].getFullYear() - dateExtent[0].getFullYear());
  const autoFormat = yearSpan >= 1 ? '%Y' : '%b';
  const formatStr = config.xTickFormat ?? autoFormat;
  select(xAxisGroup).call(
    axisBottom<Date>(xScale)
      .ticks(config.xMaxTicks ?? DEFAULT_X_MAX_TICKS)
      .tickFormat(timeFormat(formatStr) as (d: Date | number) => string)
  );

  // ── Connector line (chronological) ─────────────────────────────────
  if (config.showConnector !== false && normalized.length > 1) {
    const lineGen = d3Line<typeof normalized[0]>()
      .x((d) => xScale(d._dateValue))
      .y((d) => yScale(config.rungs[d._rung]) ?? 0)
      .curve(curveStepAfter);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'lc-connector');
    path.setAttribute('d', lineGen(normalized) || '');
    if (config.connectorColor) path.style.stroke = config.connectorColor;
    plotGroup.appendChild(path);
  }

  // ── Marks ─────────────────────────────────────────────────────────
  const marksGroup = document.createElementNS(SVG_NS, 'g');
  marksGroup.setAttribute('class', 'lc-marks');
  plotGroup.appendChild(marksGroup);

  for (const d of normalized) {
    const cx = xScale(d._dateValue);
    const cy = yScale(config.rungs[d._rung]) ?? 0;
    const r = d.radius ?? config.markRadius ?? DEFAULT_MARK_RADIUS;

    const mark = document.createElementNS(SVG_NS, 'circle');
    mark.setAttribute('class', 'lc-mark');
    mark.setAttribute('cx', String(cx));
    mark.setAttribute('cy', String(cy));
    mark.setAttribute('r', String(r));
    if (d.color || config.markColor) mark.style.fill = d.color ?? config.markColor!;

    if (d.label) {
      const ariaParts = [d.label, d.detail].filter(Boolean).join(' — ');
      mark.setAttribute('aria-label', ariaParts);
      const titleEl = document.createElementNS(SVG_NS, 'title');
      titleEl.textContent = ariaParts;
      mark.appendChild(titleEl);
    }

    if (config.onMarkClick) {
      mark.style.cursor = 'pointer';
      mark.addEventListener('click', (ev) => config.onMarkClick!(d, ev));
    }
    if (config.onMarkHover) {
      mark.addEventListener('mouseenter', (ev) => config.onMarkHover!(d, ev));
      mark.addEventListener('mouseleave', (ev) => config.onMarkHover!(null, ev));
    }
    marksGroup.appendChild(mark);
  }

  // Source / footnote
  if (config.source) {
    const src = document.createElementNS(SVG_NS, 'text');
    src.setAttribute('class', 'lc-source');
    src.setAttribute('x', String(width - margins.right));
    src.setAttribute('y', String(height - 6));
    src.setAttribute('text-anchor', 'end');
    src.textContent = `Source: ${config.source}`;
    svg.appendChild(src);
  }
}

