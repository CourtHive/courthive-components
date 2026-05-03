/**
 * Schedule Page — Active Strip
 *
 * The active strip is a one-row summary that sits above the court grid and
 * shows, for each court, what is "actively" happening: the in-progress
 * matchUp if any, otherwise the next pending matchUp, otherwise the most
 * recent completed matchUp, otherwise free.
 *
 * Two pure functions:
 *
 *   - computeActiveStrip(grid)
 *       Picks the cell to surface per court column.
 *
 *   - computeActiveStripDropTarget(grid, courtId, dragged)
 *       Picks a row when a matchUp is dropped onto a court's strip cell.
 *       It infers a "temporal floor" from the existing grid:
 *         (a) any row across all courts where the dragged matchUp's
 *             participants already appear — the dragged matchUp must land
 *             below those rows;
 *         (b) within the same draw, any row holding a lower-round matchUp —
 *             the dragged matchUp must land below those rows too.
 *       The dragged matchUp's own existing cell is ignored (relocation).
 *
 * Both functions are framework-free and DOM-free; tests do not require a UI.
 */

export interface ActiveStripGridMatchUp {
  matchUpId: string;
  drawId?: string;
  roundNumber?: number;
  matchUpStatus?: string;
  winningSide?: number;
  /** True when at least one set/score has been entered. */
  hasScore?: boolean;
  participantIds: string[];
  /**
   * Consumer-defined opaque payload, passed through unchanged.
   * Useful so the cell renderer can reach the full grid-cell data.
   */
  payload?: unknown;
}

export interface ActiveStripCourtColumn {
  courtId: string;
  /** Ordered cells from row 0 (top) downward. `null` marks an empty row. */
  cells: (ActiveStripGridMatchUp | null)[];
}

export interface ActiveStripGrid {
  columns: ActiveStripCourtColumn[];
}

export type ActiveStripCellState = 'free' | 'in-progress' | 'next' | 'completed';

export interface ActiveStripCell {
  courtId: string;
  state: ActiveStripCellState;
  matchUp?: ActiveStripGridMatchUp;
  rowIndex?: number;
}

export interface ActiveStripDropCandidate {
  matchUpId: string;
  drawId?: string;
  roundNumber?: number;
  participantIds: string[];
}

export interface ActiveStripDropTarget {
  courtId: string;
  rowIndex: number;
}

export interface ActiveStripStatusOptions {
  inProgressStatuses?: ReadonlySet<string>;
  completedStatuses?: ReadonlySet<string>;
}

const DEFAULT_IN_PROGRESS_STATUSES: ReadonlySet<string> = new Set(['IN_PROGRESS', 'SUSPENDED']);

const DEFAULT_COMPLETED_STATUSES: ReadonlySet<string> = new Set([
  'CANCELLED',
  'ABANDONED',
  'COMPLETED',
  'DEAD_RUBBER',
  'DEFAULTED',
  'DOUBLE_WALKOVER',
  'DOUBLE_DEFAULT',
  'RETIRED',
  'WALKOVER'
]);

const KIND_IN_PROGRESS = 'in-progress';
const KIND_PENDING = 'pending';
const KIND_COMPLETED = 'completed';

type Classification = typeof KIND_IN_PROGRESS | typeof KIND_PENDING | typeof KIND_COMPLETED;

function classify(
  cell: ActiveStripGridMatchUp,
  inProgress: ReadonlySet<string>,
  completed: ReadonlySet<string>
): Classification {
  const status = cell.matchUpStatus;
  if (status && inProgress.has(status)) return KIND_IN_PROGRESS;
  if (cell.hasScore && cell.winningSide === undefined && (!status || !completed.has(status))) {
    return KIND_IN_PROGRESS;
  }
  if (status && completed.has(status)) return KIND_COMPLETED;
  if (cell.winningSide !== undefined) return KIND_COMPLETED;
  return KIND_PENDING;
}

export function computeActiveStripCell(
  column: ActiveStripCourtColumn,
  options?: ActiveStripStatusOptions
): ActiveStripCell {
  const inProgress = options?.inProgressStatuses ?? DEFAULT_IN_PROGRESS_STATUSES;
  const completed = options?.completedStatuses ?? DEFAULT_COMPLETED_STATUSES;
  const cells = column.cells;

  let firstPendingIndex = -1;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell) continue;

    const kind = classify(cell, inProgress, completed);

    if (kind === KIND_IN_PROGRESS) {
      return { courtId: column.courtId, state: KIND_IN_PROGRESS, matchUp: cell, rowIndex: i };
    }
    if (kind === KIND_PENDING && firstPendingIndex === -1) {
      firstPendingIndex = i;
    }
  }

  if (firstPendingIndex !== -1) {
    return {
      courtId: column.courtId,
      state: 'next',
      matchUp: cells[firstPendingIndex] as ActiveStripGridMatchUp,
      rowIndex: firstPendingIndex
    };
  }

  // No active or pending matchUps — render the cell as free even when the
  // column has only completed matchUps. The grid below already shows the
  // history; the strip is for what's "active".
  return { courtId: column.courtId, state: 'free' };
}

export function computeActiveStrip(
  grid: ActiveStripGrid,
  options?: ActiveStripStatusOptions
): ActiveStripCell[] {
  return grid.columns.map((column) => computeActiveStripCell(column, options));
}

function shareParticipant(cell: ActiveStripGridMatchUp, participants: ReadonlySet<string>): boolean {
  if (participants.size === 0) return false;
  for (const pid of cell.participantIds) {
    if (participants.has(pid)) return true;
  }
  return false;
}

function isEarlierRoundOfSameDraw(cell: ActiveStripGridMatchUp, dragged: ActiveStripDropCandidate): boolean {
  return (
    dragged.roundNumber !== undefined &&
    dragged.drawId !== undefined &&
    cell.drawId === dragged.drawId &&
    cell.roundNumber !== undefined &&
    cell.roundNumber < dragged.roundNumber
  );
}

function computeFloors(
  grid: ActiveStripGrid,
  dragged: ActiveStripDropCandidate
): { participantFloor: number; earlierRoundFloor: number } {
  const participants = new Set(dragged.participantIds ?? []);
  let participantFloor = -1;
  let earlierRoundFloor = -1;

  for (const column of grid.columns) {
    for (let rowIndex = 0; rowIndex < column.cells.length; rowIndex++) {
      const cell = column.cells[rowIndex];
      if (!cell || cell.matchUpId === dragged.matchUpId) continue;

      if (rowIndex > participantFloor && shareParticipant(cell, participants)) {
        participantFloor = rowIndex;
      }
      if (rowIndex > earlierRoundFloor && isEarlierRoundOfSameDraw(cell, dragged)) {
        earlierRoundFloor = rowIndex;
      }
    }
  }

  return { participantFloor, earlierRoundFloor };
}

function findFirstFreeRow(
  column: ActiveStripCourtColumn,
  fromRow: number,
  draggedMatchUpId: string
): number {
  let rowIndex = fromRow;
  while (rowIndex < column.cells.length) {
    const cell = column.cells[rowIndex];
    if (!cell || cell.matchUpId === draggedMatchUpId) return rowIndex;
    rowIndex++;
  }
  return rowIndex;
}

export function computeActiveStripDropTarget(
  grid: ActiveStripGrid,
  targetCourtId: string,
  dragged: ActiveStripDropCandidate
): ActiveStripDropTarget {
  const targetColumn = grid.columns.find((c) => c.courtId === targetCourtId);
  if (!targetColumn) {
    throw new Error(`computeActiveStripDropTarget: court "${targetCourtId}" not present in grid`);
  }

  const { participantFloor, earlierRoundFloor } = computeFloors(grid, dragged);
  const baseRow = Math.max(0, participantFloor + 1, earlierRoundFloor + 1);
  const rowIndex = findFirstFreeRow(targetColumn, baseRow, dragged.matchUpId);

  return { courtId: targetCourtId, rowIndex };
}
