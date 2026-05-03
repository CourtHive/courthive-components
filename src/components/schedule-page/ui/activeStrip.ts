/**
 * Active Strip — one-row court summary that sits above the court grid.
 *
 * For each court column the strip shows what's "active": in-progress matchUp,
 * else next pending, else free (completed-only columns render empty).
 * Each cell is a drop target — when a matchUp is dropped, the strip uses the
 * temporal floor inference (computeActiveStripDropTarget) to pick a sensible
 * row in the underlying grid and fires onMatchUpDrop with the resolved target.
 *
 * Layout: when the consumer supplies `gridTemplateColumns` matching the grid
 * below, the strip switches to CSS grid and emits a leading spacer cell so its
 * court cells align horizontally with the grid's court columns.
 *
 * Cell content: by default the strip renders nothing for free cells and a
 * minimal participant text for active/next cells. Pass `renderCell` to render
 * a richer DOM (e.g. the same buildScheduleGridCell DOM used in the grid).
 */

import type { SchedulePageDragPayload, SchedulePageState, UIPanel } from '../types';
import {
  computeActiveStrip,
  computeActiveStripDropTarget
} from '../domain/activeStrip';
import type {
  ActiveStripCell,
  ActiveStripDropCandidate,
  ActiveStripDropTarget,
  ActiveStripGrid,
  ActiveStripGridMatchUp,
  ActiveStripStatusOptions
} from '../domain/activeStrip';

export interface ActiveStripCourtMeta {
  courtId: string;
  label: string;
}

export interface ActiveStripPanelData {
  /** Court columns, in display order. The strip computes one cell per column. */
  grid: ActiveStripGrid;
  /** Optional display labels per courtId. Falls back to courtId. */
  courts?: ActiveStripCourtMeta[];
  /**
   * CSS grid-template-columns applied to the strip root. When provided, the
   * strip lays out as `display: grid` with a leading spacer occupying the
   * first column, so its court cells align with the grid below.
   */
  gridTemplateColumns?: string;
  /**
   * Explicit min-width applied to the strip root, e.g. to match the grid
   * below so both scroll horizontally as one when wrapped in a shared
   * scroll container.
   */
  minWidth?: string;
}

export interface ActiveStripPanelCallbacks {
  /**
   * Called when a matchUp is dropped onto a court's strip cell.
   * The target carries the courtId and the inferred rowIndex.
   * Consumer is responsible for committing the schedule mutation.
   */
  onMatchUpDrop?: (
    payload: SchedulePageDragPayload,
    target: ActiveStripDropTarget,
    event: DragEvent
  ) => void;
}

export type ActiveStripCellRenderer = (matchUp: ActiveStripGridMatchUp) => HTMLElement | null;

export interface ActiveStripPanelOptions {
  statusOptions?: ActiveStripStatusOptions;
  /** Min-height applied to each strip cell. Match the grid row height for visual parity. */
  cellHeight?: string;
  /** Optional renderer for cells with a matchUp. Receives the cell's matchUp (incl. opaque payload). */
  renderCell?: ActiveStripCellRenderer;
  /** Small label rendered inside the leading spacer (e.g. "Now"). Hidden when omitted. */
  spacerLabel?: string;
}

export interface ActiveStripPanel extends UIPanel<SchedulePageState> {
  setData: (data: ActiveStripPanelData) => void;
}

const DROP_OVER_CLASS = 'drop-over';

function attachDropTarget(
  root: HTMLElement,
  cell: ActiveStripCell,
  callbacks: ActiveStripPanelCallbacks,
  getGrid: () => ActiveStripGrid
): void {
  root.addEventListener('dragover', (e) => {
    e.preventDefault();
    root.classList.add(DROP_OVER_CLASS);
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  });
  root.addEventListener('dragleave', () => {
    root.classList.remove(DROP_OVER_CLASS);
  });
  root.addEventListener('drop', (e) => {
    root.classList.remove(DROP_OVER_CLASS);
    e.preventDefault();
    if (!callbacks.onMatchUpDrop) return;

    let payload: SchedulePageDragPayload;
    try {
      payload = JSON.parse(e.dataTransfer?.getData('application/json') ?? '');
    } catch {
      return;
    }
    if (payload.type !== 'CATALOG_MATCHUP' && payload.type !== 'GRID_MATCHUP') return;

    const candidate: ActiveStripDropCandidate = {
      matchUpId: payload.matchUp.matchUpId,
      drawId: payload.matchUp.drawId,
      roundNumber: payload.matchUp.roundNumber,
      participantIds: (payload.matchUp.sides ?? [])
        .map((s) => s.participantId)
        .filter((id): id is string => !!id)
    };

    const target = computeActiveStripDropTarget(getGrid(), cell.courtId, candidate);
    callbacks.onMatchUpDrop(payload, target, e);
  });
}

function statePillLabel(state: ActiveStripCell['state']): string | null {
  if (state === 'in-progress') return 'LIVE';
  if (state === 'next') return 'NEXT';
  return null;
}

function buildCellElement(
  cell: ActiveStripCell,
  callbacks: ActiveStripPanelCallbacks,
  getGrid: () => ActiveStripGrid,
  options: ActiveStripPanelOptions
): HTMLElement {
  const root = document.createElement('div');
  root.className = `spl-active-strip-cell state-${cell.state}`;
  root.dataset.courtId = cell.courtId;
  if (cell.rowIndex !== undefined) root.dataset.rowIndex = String(cell.rowIndex);
  if (options.cellHeight) root.style.minHeight = options.cellHeight;

  if (cell.state !== 'free' && cell.matchUp) {
    const content = options.renderCell?.(cell.matchUp);
    if (content) {
      root.appendChild(content);
    } else {
      const body = document.createElement('div');
      body.className = 'spl-active-strip-body';
      body.textContent = cell.matchUp.participantIds.join(' – ') || cell.matchUp.matchUpId;
      root.appendChild(body);
    }
  }

  const pillText = statePillLabel(cell.state);
  if (pillText) {
    const pill = document.createElement('span');
    pill.className = 'spl-active-strip-state-pill';
    pill.textContent = pillText;
    root.appendChild(pill);
  }

  attachDropTarget(root, cell, callbacks, getGrid);
  return root;
}

function buildSpacer(options: ActiveStripPanelOptions): HTMLElement {
  const spacer = document.createElement('div');
  spacer.className = 'spl-active-strip-spacer';
  if (options.cellHeight) spacer.style.minHeight = options.cellHeight;
  if (options.spacerLabel) {
    const label = document.createElement('span');
    label.className = 'spl-active-strip-spacer-label';
    label.textContent = options.spacerLabel;
    spacer.appendChild(label);
  }
  return spacer;
}

export function buildActiveStripPanel(
  callbacks: ActiveStripPanelCallbacks = {},
  options: ActiveStripPanelOptions = {}
): ActiveStripPanel {
  const root = document.createElement('div');
  root.className = 'spl-active-strip';

  let data: ActiveStripPanelData = { grid: { columns: [] }, courts: [] };

  function getGrid(): ActiveStripGrid {
    return data.grid;
  }

  function render(): void {
    root.innerHTML = '';
    if (data.gridTemplateColumns) {
      root.style.display = 'grid';
      root.style.gridTemplateColumns = data.gridTemplateColumns;
    } else {
      root.style.display = '';
      root.style.gridTemplateColumns = '';
    }
    root.style.minWidth = data.minWidth ?? '';

    // Leading spacer aligns court cells with the grid below the row-number column.
    root.appendChild(buildSpacer(options));

    const cells = computeActiveStrip(data.grid, options.statusOptions);
    for (const cell of cells) {
      root.appendChild(buildCellElement(cell, callbacks, getGrid, options));
    }
  }

  function setData(next: ActiveStripPanelData): void {
    data = next;
    render();
  }

  function update(state: SchedulePageState): void {
    root.hidden = !state.activeStripVisible;
  }

  return { element: root, setData, update };
}
