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
export type ActiveStripCellState = 'free' | 'in-progress' | 'suspended' | 'next' | 'due' | 'completed';
export interface ActiveStripCell {
    courtId: string;
    state: ActiveStripCellState;
    matchUp?: ActiveStripGridMatchUp;
    rowIndex?: number;
    /**
     * Set only on a `free` cell whose column still holds an un-called pending matchUp: the court is
     * idle now, but work is queued on it and will move onto the strip when it is called.
     */
    hasPending?: boolean;
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
    /**
     * MatchUps that should have started by now and have not been called.
     *
     * The consumer decides — the rule needs a venue-local clock and knowledge of
     * the schedule annotations (a "followed by" matchUp was never promised its
     * `scheduledTime`), neither of which this component has.
     *
     * Only consulted for a court with nothing live and nothing called, which is
     * the case where the `free` state was lying: the court is not free-and-fine,
     * it is idle with work waiting on it.
     */
    dueMatchUpIds?: ReadonlySet<string>;
}
export declare function computeActiveStripCell(column: ActiveStripCourtColumn, options?: ActiveStripStatusOptions): ActiveStripCell;
export declare function computeActiveStrip(grid: ActiveStripGrid, options?: ActiveStripStatusOptions): ActiveStripCell[];
export declare function computeActiveStripDropTarget(grid: ActiveStripGrid, targetCourtId: string, dragged: ActiveStripDropCandidate, options?: ActiveStripStatusOptions): ActiveStripDropTarget;
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
export declare function computeReschedulePlacements(targetGrid: ActiveStripGrid, candidates: RescheduleCandidate[]): ReschedulePlacement[];
