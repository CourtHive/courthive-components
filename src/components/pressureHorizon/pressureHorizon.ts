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

import { buildHorizonRowSvg } from './horizonRow';
import { buildHorizonLegend } from './horizonLegend';
import { buildHorizonRows } from './horizonBands';
import { defaultRoundLabel } from '../pressureChart/pressureChart';
import { byPathDifficulty } from '../pressureChart/buildPressureSeries';

// constants and types
import { HORIZON_SOURCE } from './types';
import type { HorizonSource } from './types';
import type { PressureSeries } from '../pressureChart/types';

const ROOT_CLASS = 'chc-ph';
const ROW_CLASS = 'chc-ph__row';

const DEFAULT_WIDTH = 520;
const DEFAULT_ROW_HEIGHT = 16;
const DEFAULT_LABEL_WIDTH = 132;

export const HORIZON_ORDER = { DRAW: 'draw', DIFFICULTY: 'difficulty' } as const;
export type HorizonOrder = (typeof HORIZON_ORDER)[keyof typeof HORIZON_ORDER];

export type PressureHorizonOptions = {
  /** Width of the wall strip, excluding the label gutter. */
  width?: number;
  rowHeight?: number;
  rowGap?: number;
  /** Surface gap between round columns. */
  columnGap?: number;
  bands?: number;
  source?: HorizonSource;
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

function buildCaption({
  shown,
  ordered,
  dropped,
  domainMax,
  bands,
  clippedCells,
  order
}: {
  shown: number;
  ordered: number;
  dropped: number;
  domainMax: number;
  bands: number;
  clippedCells: number;
  order: HorizonOrder;
}): HTMLElement {
  const caption = el('div', 'chc-ph__caption');
  const sorted = order === HORIZON_ORDER.DRAW ? 'draw order' : 'hardest slot first';
  const parts = [`${shown} paths · ${sorted}`, `shared domain ±${Math.round(domainMax)} · ${bands} bands`];
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
      rowHeight = DEFAULT_ROW_HEIGHT,
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
    const built = buildHorizonRows({ series: shown, source, bands, domainMax });
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
        buildHorizonRowSvg(horizonRow, {
          width,
          height: rowHeight,
          gap: columnGap,
          describe: true,
          roundLabels,
          scaleName
        })
      );

      if (onSelect) attachSelection(row, entry, onSelect);
      rows.appendChild(row);
    }
    root.appendChild(rows);

    if (showLegend) root.appendChild(buildHorizonLegend({ bands: built.bands, scaleName }));
    root.appendChild(
      buildCaption({
        shown: shown.length,
        ordered: ordered.length,
        dropped: current.length - rated.length,
        domainMax: built.domainMax,
        bands: built.bands,
        clippedCells: built.clippedCells,
        order
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
