/**
 * Small multiples — one sparkline-scale pressure chart per participant.
 *
 * This is the "all players" view, and it is a GRID rather than an overlay on
 * purpose. A 32-player overlay is 32 series; hue cannot carry 32 identities and
 * cycling a categorical palette to fake it is the most common way this kind of
 * chart goes wrong. Here identity comes from the label above each cell, and
 * colour is left to mean only what it means everywhere else in the library:
 * scoreline closeness.
 *
 * All cells share one y domain so the grid is actually comparable — the whole
 * point of small multiples, and trivially easy to get wrong by letting each cell
 * autoscale.
 */

import { buildPressureChart, resolveYDomain } from './pressureChart';
import { byPathDifficulty } from './buildPressureSeries';

// constants and types
import type { PressureChartOptions } from './pressureChart';
import type { PressureSeries } from './types';

const DEFAULT_CELL_WIDTH = 150;
const DEFAULT_CELL_HEIGHT = 64;

export type PressureSmallMultiplesOptions = {
  cellWidth?: number;
  cellHeight?: number;
  /** Cap the cells rendered; the number dropped is stated in the caption. */
  limit?: number;
  scaleName?: string;
  onSelect?: (series: PressureSeries) => void;
  emptyMessage?: string;
};

export type PressureSmallMultiplesInstance = {
  element: HTMLElement;
  update: (series: PressureSeries[], options?: PressureSmallMultiplesOptions) => void;
};

/** One y domain across every cell, so the grid can be read as a comparison. */
export function sharedYDomain(series: PressureSeries[]): [number, number] {
  return resolveYDomain(series.flatMap((entry) => entry.points));
}

function buildCell({
  series,
  options,
  chartOptions,
}: {
  series: PressureSeries;
  options: PressureSmallMultiplesOptions;
  chartOptions: PressureChartOptions;
}): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'chc-psm__cell';
  cell.dataset.participantId = series.participantId;

  const label = document.createElement('div');
  label.className = 'chc-psm__label';
  label.textContent = series.participantName ?? series.participantId;
  label.title = label.textContent;
  cell.appendChild(label);

  buildPressureChart(cell, series, chartOptions);

  if (options.onSelect) {
    cell.classList.add('is-clickable');
    cell.setAttribute('role', 'button');
    cell.tabIndex = 0;
    cell.addEventListener('click', () => options.onSelect?.(series));
    cell.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        options.onSelect?.(series);
      }
    });
  }

  return cell;
}

export function buildPressureSmallMultiples(
  container: HTMLElement,
  series: PressureSeries[] = [],
  options: PressureSmallMultiplesOptions = {},
): PressureSmallMultiplesInstance {
  const root = document.createElement('div');
  root.className = 'chc-psm';
  container.appendChild(root);

  function render(current: PressureSeries[], currentOptions: PressureSmallMultiplesOptions): void {
    root.replaceChildren();
    const ordered = byPathDifficulty(current).filter((entry) => entry.rating);
    if (!ordered.length) {
      const empty = document.createElement('div');
      empty.className = 'chc-pc__empty';
      empty.textContent = currentOptions.emptyMessage ?? 'No rating data for this draw, so no pressure to plot.';
      root.appendChild(empty);
      return;
    }

    const yDomain = sharedYDomain(ordered);
    const grid = document.createElement('div');
    grid.className = 'chc-psm__grid';

    const shown = currentOptions.limit ? ordered.slice(0, currentOptions.limit) : ordered;
    for (const entry of shown) {
      grid.appendChild(
        buildCell({
          series: entry,
          options: currentOptions,
          chartOptions: {
            spark: true,
            yDomain,
            width: currentOptions.cellWidth ?? DEFAULT_CELL_WIDTH,
            height: currentOptions.cellHeight ?? DEFAULT_CELL_HEIGHT,
            scaleName: currentOptions.scaleName,
          },
        }),
      );
    }
    root.appendChild(grid);

    const caption = document.createElement('div');
    caption.className = 'chc-psm__caption';
    const dropped = current.length - ordered.length;
    const parts = ['hardest slot first · shared scale'];
    if (shown.length < ordered.length) parts.push(`${ordered.length - shown.length} of ${ordered.length} not shown`);
    if (dropped > 0) parts.push(`${dropped} unrated omitted`);
    caption.textContent = parts.join(' · ');
    root.appendChild(caption);
  }

  render(series, options);

  return {
    element: root,
    update: (next, nextOptions) => render(next, { ...options, ...nextOptions }),
  };
}
