/**
 * Pressure horizon — many participants' paths, stacked and tightly packed.
 *
 * The density view that `pressureChart`'s small multiples deliberately are not.
 * Small multiples spend a 150x64 cell per participant and cap out around a dozen
 * before the grid stops being scannable; a horizon row costs 16px of height, so a
 * 64-draw stacks inside a single screen and the shape of the whole field becomes
 * one image.
 *
 * What you buy that density with is height: magnitude is folded into colour
 * bands instead of y-position (see `horizonBands`). That trade is why this is a
 * SECOND chart rather than a replacement — the fold is lossy in exactly the way
 * the detail view is not, and reading a precise delta off a horizon row is
 * something you should not be able to do. Rows are clickable so the detail chart
 * is always one step away.
 *
 * Every row shares one domain. Letting rows autoscale would make an easy road and
 * a brutal one paint identically, which is the only way this chart can lie.
 */

import { buildHorizonRibbonSvg } from './horizonRibbon';
import { buildHorizonRowSvg } from './horizonRow';
import { buildHorizonLegend } from './horizonLegend';
import { buildHorizonRows } from './horizonBands';
import { defaultRoundLabel } from '../pressureChart/pressureChart';
import { byPathDifficulty } from '../pressureChart/buildPressureSeries';

// constants and types
import { HORIZON_SOURCE } from './types';
import type { HorizonSource, HorizonRow } from './types';
import type { ProjectedPressureResult, PressureSeries } from '../pressureChart/types';

const ROOT_CLASS = 'chc-ph';
const ROW_CLASS = 'chc-ph__row';

const DEFAULT_WIDTH = 520;
const DEFAULT_LABEL_WIDTH = 132;

/**
 * Walls stay readable at 10px; a line plus a fan needs room for both, so the ribbon
 * defaults taller. That is the trade the two variants exist to offer — connectedness
 * costs roughly half the density.
 */
const DEFAULT_ROW_HEIGHT = { walls: 16, ribbon: 28 } as const;

/**
 * Bands of the domain mapped to half the ribbon's row height. Two of four measured
 * best: the full domain leaves a median value moving ~3px, and one band saturates
 * roughly two thirds of cells. Stated in the caption, because a reader cannot tell a
 * saturated trace from one that genuinely sits at the edge.
 */
const RIBBON_POSITION_BANDS = 2;

export const HORIZON_ORDER = { DRAW: 'draw', DIFFICULTY: 'difficulty' } as const;
export type HorizonOrder = (typeof HORIZON_ORDER)[keyof typeof HORIZON_ORDER];

/**
 * How a row is drawn. Neither is a replacement for the other:
 *
 *  - WALLS  — one hard-edged column per round, magnitude folded into colour bands.
 *             Maximum density; reads down to 10px rows.
 *  - RIBBON — a connected line through the rounds inside a fan of possible
 *             opponents. Carries the spread the walls discard, and makes a near-zero
 *             delta visible instead of a 1px sliver. Wants ~22px.
 */
export const HORIZON_VARIANT = { WALLS: 'walls', RIBBON: 'ribbon' } as const;
export type HorizonVariant = (typeof HORIZON_VARIANT)[keyof typeof HORIZON_VARIANT];

export type PressureHorizonOptions = {
  /** Width of the wall strip, excluding the label gutter. */
  width?: number;
  rowHeight?: number;
  rowGap?: number;
  /** Surface gap between round columns. */
  columnGap?: number;
  bands?: number;
  variant?: HorizonVariant;
  source?: HorizonSource;
  /**
   * The projection `buildPressureSeries` returns beside `series`. Only the ribbon
   * reads it, and only to weight the inner fan; without it the fan falls back to the
   * unweighted low/high envelope and says so.
   */
  projection?: ProjectedPressureResult;
  /** Fix the domain across several stacks so they can be read against each other. */
  domainMax?: number;
  showLabels?: boolean;
  labelWidth?: number;
  showLegend?: boolean;
  showRoundHeader?: boolean;
  scaleName?: string;
  order?: HorizonOrder;
  /** Cap the rows rendered; the number dropped is stated in the caption. */
  limit?: number;
  onSelect?: (series: PressureSeries) => void;
  roundLabels?: (roundNumber: number, index: number, total: number) => string;
  emptyMessage?: string;
};

export type PressureHorizonInstance = {
  element: HTMLElement;
  update: (series: PressureSeries[], options?: PressureHorizonOptions) => void;
  destroy: () => void;
};

function el(tag: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function orderSeries(series: PressureSeries[], order: HorizonOrder): PressureSeries[] {
  if (order === HORIZON_ORDER.DIFFICULTY) return byPathDifficulty(series);
  return series.toSorted((a, b) => (a.drawPosition ?? 0) - (b.drawPosition ?? 0));
}

function buildRoundHeader({
  roundNumbers,
  width,
  columnGap,
  labelWidth,
  roundLabels
}: {
  roundNumbers: number[];
  width: number;
  columnGap: number;
  labelWidth: number;
  roundLabels: (roundNumber: number, index: number, total: number) => string;
}): HTMLElement {
  const head = el('div', 'chc-ph__head');
  const spacer = el('div', 'chc-ph__label');
  spacer.style.width = `${labelWidth}px`;
  head.appendChild(spacer);

  const strip = el('div', 'chc-ph__rounds');
  strip.style.width = `${width}px`;
  strip.style.gap = `${columnGap}px`;
  for (const [index, roundNumber] of roundNumbers.entries()) {
    const cell = el('span', 'chc-ph__round-label');
    cell.textContent = roundLabels(roundNumber, index, roundNumbers.length);
    strip.appendChild(cell);
  }
  head.appendChild(strip);
  return head;
}

function attachSelection(row: HTMLElement, entry: PressureSeries, onSelect: (series: PressureSeries) => void): void {
  row.classList.add('is-clickable');
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  row.addEventListener('click', () => onSelect(entry));
  row.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(entry);
    }
  });
}

/** Dispatch to the variant's renderer. Both consume the same `HorizonRow`. */
function renderRow(
  horizonRow: HorizonRow,
  {
    variant,
    width,
    rowHeight,
    columnGap,
    roundLabels,
    scaleName,
    domainMax,
    bands
  }: {
    variant: HorizonVariant;
    width: number;
    rowHeight: number;
    columnGap: number;
    roundLabels: (roundNumber: number, index: number, total: number) => string;
    scaleName?: string;
    domainMax: number;
    bands: number;
  }
): SVGElement {
  if (variant === HORIZON_VARIANT.RIBBON) {
    return buildHorizonRibbonSvg(horizonRow, {
      width,
      height: rowHeight,
      domainMax,
      bands,
      positionBands: RIBBON_POSITION_BANDS,
      describe: true,
      roundLabels,
      scaleName
    });
  }
  return buildHorizonRowSvg(horizonRow, {
    width,
    height: rowHeight,
    gap: columnGap,
    describe: true,
    roundLabels,
    scaleName
  });
}

function buildCaption({
  shown,
  ordered,
  dropped,
  domainMax,
  bands,
  clippedCells,
  order,
  variant,
  unweightedFan
}: {
  shown: number;
  ordered: number;
  dropped: number;
  domainMax: number;
  bands: number;
  clippedCells: number;
  order: HorizonOrder;
  variant: HorizonVariant;
  unweightedFan: boolean;
}): HTMLElement {
  const caption = el('div', 'chc-ph__caption');
  const sorted = order === HORIZON_ORDER.DRAW ? 'draw order' : 'hardest slot first';
  const parts = [`${shown} paths · ${sorted}`, `shared domain ±${Math.round(domainMax)} · ${bands} bands`];
  if (variant === HORIZON_VARIANT.RIBBON) {
    parts.push(`trace saturates past ${RIBBON_POSITION_BANDS} of ${bands} bands — colour carries the rest`);
  }
  if (variant === HORIZON_VARIANT.RIBBON && unweightedFan) {
    parts.push('fan is the unweighted 1%-threshold range — pass `projection` to weight it');
  }
  if (shown < ordered) parts.push(`${ordered - shown} of ${ordered} not shown`);
  if (dropped > 0) parts.push(`${dropped} unrated omitted`);
  if (clippedCells > 0) parts.push(`${clippedCells} walls capped at the top band`);
  caption.textContent = parts.join(' · ');
  return caption;
}

export function buildPressureHorizon(
  container: HTMLElement,
  series: PressureSeries[] = [],
  options: PressureHorizonOptions = {}
): PressureHorizonInstance {
  const root = el('div', ROOT_CLASS);
  container.appendChild(root);

  function render(current: PressureSeries[], currentOptions: PressureHorizonOptions): void {
    root.replaceChildren();

    const {
      width = DEFAULT_WIDTH,
      variant = HORIZON_VARIANT.WALLS,
      rowHeight = DEFAULT_ROW_HEIGHT[variant],
      rowGap = 2,
      columnGap = 2,
      bands,
      source = HORIZON_SOURCE.PROJECTED,
      domainMax,
      showLabels = true,
      showLegend = true,
      showRoundHeader = true,
      order = HORIZON_ORDER.DRAW,
      limit,
      scaleName,
      onSelect,
      projection,
      roundLabels = defaultRoundLabel
    } = currentOptions;

    const rated = current.filter((entry) => entry.rating);
    if (!rated.length) {
      const empty = el('div', 'chc-ph__empty');
      empty.textContent =
        currentOptions.emptyMessage ?? 'No rating data for this draw, so there is no pressure to plot.';
      root.appendChild(empty);
      return;
    }

    const ordered = orderSeries(rated, order);
    const shown = limit ? ordered.slice(0, limit) : ordered;
    const built = buildHorizonRows({ series: shown, source, bands, domainMax, projection });
    const labelWidth = showLabels ? (currentOptions.labelWidth ?? DEFAULT_LABEL_WIDTH) : 0;

    if (showRoundHeader) {
      root.appendChild(
        buildRoundHeader({ roundNumbers: built.roundNumbers, width, columnGap, labelWidth, roundLabels })
      );
    }

    const rows = el('div', 'chc-ph__rows');
    rows.style.gap = `${rowGap}px`;

    for (const [index, horizonRow] of built.rows.entries()) {
      const entry = shown[index];
      const row = el('div', ROW_CLASS);
      row.dataset.participantId = horizonRow.participantId;

      if (showLabels) {
        const label = el('div', 'chc-ph__label');
        label.style.width = `${labelWidth}px`;
        const position = horizonRow.drawPosition ? `${horizonRow.drawPosition}. ` : '';
        label.textContent = `${position}${horizonRow.participantName ?? horizonRow.participantId}`;
        label.title = label.textContent;
        row.appendChild(label);
      }

      row.appendChild(
        renderRow(horizonRow, {
          variant,
          width,
          rowHeight,
          columnGap,
          roundLabels,
          scaleName,
          domainMax: built.domainMax,
          bands: built.bands
        })
      );

      if (onSelect) attachSelection(row, entry, onSelect);
      rows.appendChild(row);
    }
    root.appendChild(rows);

    if (showLegend) root.appendChild(buildHorizonLegend({ bands: built.bands, scaleName, variant }));
    root.appendChild(
      buildCaption({
        shown: shown.length,
        ordered: ordered.length,
        dropped: current.length - rated.length,
        domainMax: built.domainMax,
        bands: built.bands,
        clippedCells: built.clippedCells,
        order,
        variant,
        unweightedFan: built.rows.some((horizonRow) =>
          horizonRow.cells.some((cell) => cell.spread && !cell.spread.weighted)
        )
      })
    );
  }

  render(series, options);

  return {
    element: root,
    update: (next, nextOptions) => render(next, { ...options, ...nextOptions }),
    destroy: () => root.remove()
  };
}
