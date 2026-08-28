/**
 * Ranked path difficulty — the entry point of the all-players surface.
 *
 * One diverging bar per participant, anchored at a zero line: right of zero is a
 * slot that must play UP, left is a slot that plays down. Diverging is the right
 * family here because the quantity is signed and has a meaningful neutral —
 * exactly the case a sequential ramp would misrepresent.
 *
 * Sorted by `slotDifficulty` (unweighted), never `pathDifficulty` (reach-weighted):
 * a weak player's brutal draw has a LOW reach-weighted score precisely because
 * they are unlikely to survive to play the hard rounds, so ranking on it reports
 * the hardest draws in the field as the easiest. This is the view a TD reads as a
 * seeding sanity check, so getting that backwards would be worse than no view.
 *
 * Publishable before a ball is struck — it needs the draw and the ratings, not
 * results.
 */

import { byPathDifficulty } from './buildPressureSeries';

// constants and types
import type { PressureSeries } from './types';

const DEFAULT_ROW_HEIGHT = 22;
const DEFAULT_WIDTH = 460;
const LABEL_WIDTH = 132;
const BAR_RADIUS = 3;

export type PathDifficultyBarOptions = {
  width?: number;
  rowHeight?: number;
  labelWidth?: number;
  /** Cap the rows rendered. When set, the count dropped is stated in the caption. */
  limit?: number;
  /** Overlay the difficulty actually faced so far, where a participant has played. */
  showActual?: boolean;
  onSelect?: (series: PressureSeries) => void;
  emptyMessage?: string;
};

export type PathDifficultyBarInstance = {
  element: HTMLElement;
  update: (series: PressureSeries[], options?: PathDifficultyBarOptions) => void;
};

function formatDelta(value: number | null): string {
  if (value === null) return '—';
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function buildRow({
  series,
  options,
  scale,
  midpoint,
  barWidth
}: {
  series: PressureSeries;
  options: PathDifficultyBarOptions;
  scale: (value: number) => number;
  midpoint: number;
  barWidth: number;
}): HTMLElement {
  const row = document.createElement('div');
  row.className = 'chc-pdb__row';
  row.dataset.participantId = series.participantId;
  row.style.height = `${options.rowHeight ?? DEFAULT_ROW_HEIGHT}px`;

  const label = document.createElement('span');
  label.className = 'chc-pdb__label';
  label.style.width = `${options.labelWidth ?? LABEL_WIDTH}px`;
  label.textContent = series.participantName ?? series.participantId;
  label.title = label.textContent;

  const track = document.createElement('span');
  track.className = 'chc-pdb__track';
  track.style.width = `${barWidth}px`;

  const zero = document.createElement('span');
  zero.className = 'chc-pdb__zero';
  zero.style.left = `${midpoint}px`;
  track.appendChild(zero);

  if (series.slotDifficulty !== null) {
    const value = scale(series.slotDifficulty);
    const bar = document.createElement('span');
    bar.className = series.slotDifficulty >= 0 ? 'chc-pdb__bar chc-pdb__bar--up' : 'chc-pdb__bar chc-pdb__bar--down';
    bar.style.left = `${Math.min(midpoint, value)}px`;
    bar.style.width = `${Math.abs(value - midpoint)}px`;
    // 4px rounded data-end, square against the zero baseline.
    bar.style.borderRadius =
      series.slotDifficulty >= 0 ? `0 ${BAR_RADIUS}px ${BAR_RADIUS}px 0` : `${BAR_RADIUS}px 0 0 ${BAR_RADIUS}px`;
    track.appendChild(bar);
  }

  if (options.showActual && series.facedDifficulty !== null) {
    const tick = document.createElement('span');
    tick.className = 'chc-pdb__actual';
    tick.style.left = `${scale(series.facedDifficulty)}px`;
    tick.title = `faced so far ${formatDelta(series.facedDifficulty)}`;
    track.appendChild(tick);
  }

  const value = document.createElement('span');
  value.className = 'chc-pdb__value';
  value.textContent = formatDelta(series.slotDifficulty);

  row.append(label, track, value);

  if (options.onSelect) {
    row.classList.add('is-clickable');
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.addEventListener('click', () => options.onSelect?.(series));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        options.onSelect?.(series);
      }
    });
  }

  return row;
}

export function buildPathDifficultyBar(
  container: HTMLElement,
  series: PressureSeries[] = [],
  options: PathDifficultyBarOptions = {}
): PathDifficultyBarInstance {
  const root = document.createElement('div');
  root.className = 'chc-pdb';
  container.appendChild(root);

  function render(current: PressureSeries[], currentOptions: PathDifficultyBarOptions): void {
    root.replaceChildren();
    const ordered = byPathDifficulty(current);
    if (!ordered.length) {
      const empty = document.createElement('div');
      empty.className = 'chc-pc__empty';
      empty.textContent = currentOptions.emptyMessage ?? 'No rating data for this draw, so no path difficulty to rank.';
      root.appendChild(empty);
      return;
    }

    const width = currentOptions.width ?? DEFAULT_WIDTH;
    const labelWidth = currentOptions.labelWidth ?? LABEL_WIDTH;
    const barWidth = Math.max(40, width - labelWidth - 52);
    const midpoint = barWidth / 2;

    const values = ordered
      .flatMap((entry) => [entry.slotDifficulty, currentOptions.showActual ? entry.facedDifficulty : null])
      .filter((value): value is number => value !== null);
    const extent = Math.max(...values.map((value) => Math.abs(value)), 1);
    const scale = (value: number) => midpoint + (value / extent) * (midpoint - 4);

    const shown = currentOptions.limit ? ordered.slice(0, currentOptions.limit) : ordered;
    for (const entry of shown) {
      root.appendChild(buildRow({ series: entry, options: currentOptions, scale, midpoint, barWidth }));
    }

    const caption = document.createElement('div');
    caption.className = 'chc-pdb__caption';
    const unrated = ordered.filter((entry) => entry.slotDifficulty === null).length;
    const parts = ['hardest slot first'];
    // Never truncate silently — say what was dropped.
    if (shown.length < ordered.length) parts.push(`${ordered.length - shown.length} of ${ordered.length} not shown`);
    if (unrated) parts.push(`${unrated} unrated`);
    caption.textContent = parts.join(' · ');
    root.appendChild(caption);
  }

  render(series, options);

  return {
    element: root,
    update: (next, nextOptions) => render(next, { ...options, ...nextOptions })
  };
}
