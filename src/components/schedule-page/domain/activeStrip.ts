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
 *       It infers a "scheduled floor" from the existing grid:
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
  /**
   * ISO timestamp set when the matchUp is "called to court". A pending matchUp
   * surfaces on the strip as `next` ONLY once it has been called (or started) —
   * merely organizing the grid must not populate the strip.
   */
  calledAt?: string;
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

export type ActiveStripCellState = 'free' | 'in-progress' | 'suspended' | 'next' | 'completed';

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
  suspendedStatuses?: ReadonlySet<string>;
  completedStatuses?: ReadonlySet<string>;
}

const DEFAULT_IN_PROGRESS_STATUSES: ReadonlySet<string> = new Set(['IN_PROGRESS']);

// SUSPENDED is an active-but-paused court: it still occupies the court (same
// surfacing precedence as in-progress) but is NOT live, so it carries its own
// state and the UI renders a "Suspended" pill that supersedes "Live". Split
// out of the in-progress set 2026-07-05 — folding it into in-progress made
// Suspend All flip every pill to "Live". Pass suspendedStatuses: new Set() to
// opt back into the old behavior.
const DEFAULT_SUSPENDED_STATUSES: ReadonlySet<string> = new Set(['SUSPENDED']);

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
const KIND_SUSPENDED = 'suspended';
const KIND_PENDING = 'pending';
const KIND_COMPLETED = 'completed';

type Classification =
  | typeof KIND_IN_PROGRESS
  | typeof KIND_SUSPENDED
  | typeof KIND_PENDING
  | typeof KIND_COMPLETED;

function classify(
  cell: ActiveStripGridMatchUp,
  inProgress: ReadonlySet<string>,
  suspended: ReadonlySet<string>,
  completed: ReadonlySet<string>
): Classification {
  const status = cell.matchUpStatus;
  if (status && suspended.has(status)) return KIND_SUSPENDED;
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
  const suspended = options?.suspendedStatuses ?? DEFAULT_SUSPENDED_STATUSES;
  const completed = options?.completedStatuses ?? DEFAULT_COMPLETED_STATUSES;
  const cells = column.cells;

  let firstPendingIndex = -1;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell) continue;

    const kind = classify(cell, inProgress, suspended, completed);

    // A suspended court is still "active" (occupies the court) so it surfaces
    // with the same precedence as in-progress; state === kind carries the
    // distinction through to the pill ('suspended' supersedes 'in-progress').
    if (kind === KIND_IN_PROGRESS || kind === KIND_SUSPENDED) {
      return { courtId: column.courtId, state: kind, matchUp: cell, rowIndex: i };
    }
    // A pending matchUp surfaces as `next` ONLY once it has been called to court
    // (calledAt set). An un-called pending match is grid organization, not
    // something happening on the court, so it stays off the strip.
    if (kind === KIND_PENDING && cell.calledAt && firstPendingIndex === -1) {
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

  // No in-progress and no called matchUp — the court reads as free even when it
  // has un-called pending or only completed matchUps. The grid below shows the
  // history/plan; the strip is only for what's live or called.
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
  dragged: ActiveStripDropCandidate,
  options?: ActiveStripStatusOptions
): ActiveStripDropTarget {
  const targetColumn = grid.columns.find((c) => c.courtId === targetCourtId);
  if (!targetColumn) {
    throw new Error(`computeActiveStripDropTarget: court "${targetCourtId}" not present in grid`);
  }

  const { participantFloor, earlierRoundFloor } = computeFloors(grid, dragged);

  // The court's active match (in-progress, else next) must stay on top: a drop
  // may never land above it. Its row is a floor, so the drop settles at or below
  // it. `options` matches the classification the rendered strip uses. Re-dropping
  // the active match onto its own court is a stable no-op (findFirstFreeRow treats
  // the dragged matchUp's own row as free and returns it).
  const activeCell = computeActiveStripCell(targetColumn, options);
  const activeFloor = activeCell.state !== 'free' && activeCell.rowIndex !== undefined ? activeCell.rowIndex : -1;

  const baseRow = Math.max(0, participantFloor + 1, earlierRoundFloor + 1, activeFloor);
  const rowIndex = findFirstFreeRow(targetColumn, baseRow, dragged.matchUpId);

  return { courtId: targetCourtId, rowIndex };
}

// ── Bulk reschedule placement ────────────────────────────────────────
//
// When matchUps are rescheduled onto a different date (e.g. a rain delay), they
// keep their court but must be re-seated in that date's grid — their old row is
// meaningless there. computeReschedulePlacements re-drops each moved matchUp
// onto its SAME court in the target date's grid, respecting the same ordering
// constraints as a manual drop, and returns null (→ caller clears the court so
// the matchUp falls into the scheduled catalog) when no legal row exists.

export interface RescheduleCandidate {
  matchUpId: string;
  /** Court to re-seat on in the target grid. Absent → cannot place (catalog). */
  courtId?: string;
  drawId?: string;
  roundNumber?: number;
  participantIds: string[];
}

export interface ReschedulePlacement {
  matchUpId: string;
  /** When placed: the (unchanged) court + 0-based row. Absent when sent to catalog. */
  courtId?: string;
  rowIndex?: number;
  /** false → no legal row; caller should clear the court assignment. */
  placed: boolean;
}

// The lowest row on a column occupied by a matchUp that must play AFTER `cand`
// (a later round of the same draw). `cand` may not seat at or below it, so this
// is a hard ceiling. Infinity when the court holds no such matchUp.
function laterRoundCeiling(column: ActiveStripCourtColumn, cand: RescheduleCandidate): number {
  if (cand.roundNumber === undefined || cand.drawId === undefined) return Infinity;
  for (let r = 0; r < column.cells.length; r++) {
    const cell = column.cells[r];
    if (!cell || cell.matchUpId === cand.matchUpId) continue;
    if (cell.drawId === cand.drawId && cell.roundNumber !== undefined && cell.roundNumber > cand.roundNumber) {
      return r;
    }
  }
  return Infinity;
}

export function computeReschedulePlacements(
  targetGrid: ActiveStripGrid,
  candidates: RescheduleCandidate[]
): ReschedulePlacement[] {
  // Mutable working copy so sequential placements constrain one another (two
  // moved matchUps sharing a participant, or earlier/later rounds of one draw).
  const columns = targetGrid.columns.map((c) => ({ courtId: c.courtId, cells: c.cells.slice() }));
  const workingGrid: ActiveStripGrid = { columns };
  const byCourt = new Map(columns.map((c) => [c.courtId, c]));

  // Seat earlier rounds first so they take the higher rows; stable by id.
  const ordered = candidates.toSorted(
    (a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0) || a.matchUpId.localeCompare(b.matchUpId)
  );

  return ordered.map((cand) => {
    const column = cand.courtId ? byCourt.get(cand.courtId) : undefined;
    if (!column) return { matchUpId: cand.matchUpId, placed: false };

    const dragged: ActiveStripDropCandidate = {
      matchUpId: cand.matchUpId,
      drawId: cand.drawId,
      roundNumber: cand.roundNumber,
      participantIds: cand.participantIds
    };
    const { participantFloor, earlierRoundFloor } = computeFloors(workingGrid, dragged);
    const floorRow = Math.max(0, participantFloor + 1, earlierRoundFloor + 1);
    const ceiling = laterRoundCeiling(column, cand);

    // First free row on the court within [floorRow, ceiling). Rows beyond the
    // current length are free (the grid extends), so appending is allowed only
    // when nothing that must play later sits below (ceiling === Infinity).
    let placedRow = -1;
    for (let r = floorRow; r <= column.cells.length && r < ceiling; r++) {
      const cell = column.cells[r];
      if (!cell || cell.matchUpId === cand.matchUpId) {
        placedRow = r;
        break;
      }
    }

    if (placedRow === -1) return { matchUpId: cand.matchUpId, placed: false };

    column.cells[placedRow] = {
      matchUpId: cand.matchUpId,
      drawId: cand.drawId,
      roundNumber: cand.roundNumber,
      participantIds: cand.participantIds
    };
    return { matchUpId: cand.matchUpId, courtId: cand.courtId, rowIndex: placedRow, placed: true };
  });
}
