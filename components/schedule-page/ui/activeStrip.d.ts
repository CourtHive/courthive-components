import { SchedulePageDragPayload, SchedulePageState, UIPanel } from '../types';
import { ActiveStripDropTarget, ActiveStripGrid, ActiveStripGridMatchUp, ActiveStripStatusOptions } from '../domain/activeStrip';
export interface ActiveStripCourtMeta {
    courtId: string;
    label: string;
}
/**
 * Active availability block surfaced on a court for the current clock time.
 * When present, the strip renders a labeled banner inside the court's cell
 * (e.g. "PRACTICE 14:00–16:00") so the TD sees at a glance that the court
 * has a non-matchUp time reservation in effect.
 *
 * The strip itself is data-driven and does NOT poll the clock; consumers
 * are expected to refresh `ActiveStripPanelData` periodically (e.g. every
 * 30s) with the blocks active at "now".
 */
export interface ActiveStripCourtBlock {
    /** Block type label, used as the banner intent class (e.g. "PRACTICE", "MAINTENANCE"). */
    type: string;
    /**
     * Banner headline — normally the block type ("PRACTICE"). Wraps rather than truncates.
     * Put the time window in `timeRange` so it gets its own line; a label that carries both
     * ("PRACTICE 14:00–16:00") still renders, but has to share one line and breaks at the space.
     */
    label: string;
    /**
     * The block's time window, pre-formatted by the consumer — e.g. "14:00–16:00". Rendered on its
     * own non-wrapping line beneath the label, so the end time is always readable in a narrow column.
     */
    timeRange?: string;
    /**
     * Optional short note (block.reason, registrant name from a future practice-registration system,
     * etc.). Dropped when it only repeats `label` (case-insensitive): a reason of "BLOCKED" under a
     * "BLOCKED" headline says nothing twice.
     */
    detail?: string;
}
/**
 * A block that has not started yet on a court that is free right now.
 *
 * Distinct from `ActiveStripCourtBlock`, which is a block in force. This one is
 * about the runway left before it: the question a director asks of an idle court
 * is "can I still put something on it", and the answer is a duration, not a
 * banner.
 */
export interface ActiveStripUpcomingBlock {
    /** Block type, for the colour — same vocabulary as `ActiveStripCourtBlock.type`. */
    type: string;
    /** Pre-formatted by the consumer, e.g. "40m → MAINTENANCE". */
    label: string;
    /** Hover text — the consumer owns the wording. */
    title?: string;
}
export interface ActiveStripPanelData {
    /** Court columns, in display order. The strip computes one cell per column. */
    grid: ActiveStripGrid;
    /**
     * MatchUps that should have started by now and have not been called — see
     * `ActiveStripStatusOptions.dueMatchUpIds`. Supplied per refresh because it
     * moves with the clock.
     */
    dueMatchUpIds?: readonly string[];
    /**
     * courtId → the block bearing down on a court that is currently FREE. The
     * consumer decides when one is worth showing; the strip only paints it.
     *
     * Ignored for a court that has a block in force (`courtBlocks` wins — a banner
     * about now beats a countdown to later) and for one with a matchUp on it,
     * where `courtBlockEdges` carries the same fact in the form that suits an
     * occupied court.
     */
    courtUpcomingBlocks?: Record<string, ActiveStripUpcomingBlock>;
    /**
     * courtId → a block that will come into force while the matchUp currently on
     * that court is still expected to be playing. Painted as a top-edge stripe:
     * a separate axis from the left-border state language, so a LIVE match on a
     * court about to close shows both rather than one hiding the other.
     */
    courtBlockEdges?: Record<string, ActiveStripUpcomingBlock>;
    /** Optional display labels per courtId. Falls back to courtId. */
    courts?: ActiveStripCourtMeta[];
    /**
     * Optional map of courtId → active availability block. When provided, the
     * strip renders a colored banner inside the court's active cell.
     */
    courtBlocks?: Record<string, ActiveStripCourtBlock>;
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
    onMatchUpDrop?: (payload: SchedulePageDragPayload, target: ActiveStripDropTarget, event: DragEvent) => void;
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
export declare function buildActiveStripPanel(callbacks?: ActiveStripPanelCallbacks, options?: ActiveStripPanelOptions): ActiveStripPanel;
