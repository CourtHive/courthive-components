/**
 * Shared types for the custom CourtTimeline component.
 */

import type { temporal } from 'tods-competition-factory';

type CourtRef = temporal.CourtRef;

// ============================================================================
// Data types (passed in by controller)
// ============================================================================

export interface TimelineGroupData {
  id: string;
  content: string;
  order?: number;
  courtRef?: CourtRef;
  surface?: string;
  indoor?: boolean;
  hasLights?: boolean;
  tags?: string[];
}

export interface TimelineItemData {
  id: string;
  group: string;
  content: string;
  start: Date | string;
  end?: Date | string;
  type?: 'range' | 'background';
  className?: string;
  style?: string;
  title?: string;
  editable?: boolean | { updateTime?: boolean; updateGroup?: boolean; remove?: boolean };
  // Domain extensions
  blockId?: string;
  status?: string;
  reason?: string;
  isBlock?: boolean;
  isSegment?: boolean;
  isConflict?: boolean;
}

// ============================================================================
// Options
// ============================================================================

export interface TimelineOptions {
  /** Visible window start */
  start?: Date;
  /** Visible window end */
  end?: Date;
  /** Minimum allowed date (pan limit) */
  min?: Date;
  /** Maximum allowed date (pan limit) */
  max?: Date;
  /** Minimum visible duration in ms (zoom limit) */
  zoomMin?: number;
  /** Maximum visible duration in ms (zoom limit) */
  zoomMax?: number;

  /** Snap function: given a Date, return snapped Date */
  snap?: (date: Date) => Date;

  /** Row height in pixels (default 40) */
  rowHeight?: number;

  /** Time axis formatting */
  timeAxis?: { scale: string; step: number };

  /** Whether to show tooltips on hover */
  showTooltips?: boolean;

  /** Enable pinch-to-zoom (ctrl+wheel). Default false. */
  enablePinchZoom?: boolean;

  /** Height of the container (CSS value) */
  height?: string;
}

// ============================================================================
// Interaction state machine
// ============================================================================

export type InteractionMode =
  | 'IDLE'
  | 'DRAGGING'
  | 'RESIZING_LEFT'
  | 'RESIZING_RIGHT'
  | 'GHOST_EDITING'
  | 'RESIZING_TOP'
  | 'RESIZING_BOTTOM';

/** State tracked during an active drag/resize gesture */
export interface GestureState {
  mode: InteractionMode;
  /** Item ID being manipulated (null for ghost creation) */
  itemId: string | null;
  /** Pointer start position (client coords) */
  startX: number;
  startY: number;
  /** Original item time range at gesture start */
  originalStart: Date;
  originalEnd: Date;
  /** Original group at gesture start */
  originalGroup: string;
  /** Current pointer position */
  currentX: number;
  currentY: number;
  /** Whether the drag threshold has been exceeded */
  thresholdExceeded: boolean;
}

// ============================================================================
// Multi-row span (ghost creation)
// ============================================================================

export interface MultiRowSpan {
  /** IDs of all groups covered by the ghost */
  groupIds: string[];
  /** Top row index (0-based) */
  topRowIndex: number;
  /** Bottom row index (inclusive, 0-based) */
  bottomRowIndex: number;
  /** Time range */
  startTime: Date;
  endTime: Date;
}

// ============================================================================
// Callbacks
// ============================================================================

export interface TimelineCallbacks {
  /** Fired when a new item should be created (double-click on empty area) */
  onAdd?: (item: { group: string; start: Date; end: Date }) => void;

  /** Fired when an item is clicked */
  onItemClick?: (itemId: string, event: PointerEvent) => void;

  /** Fired during item drag/resize for live validation */
  onMoving?: (item: { id: string; group: string; start: Date; end: Date }) => { start: Date; end: Date } | null;

  /** Fired when item drag/resize completes */
  onMove?: (item: { id: string; group: string; start: Date; end: Date }) => boolean;

  /** Fired when multi-row ghost is confirmed */
  onMultiRowCreate?: (span: MultiRowSpan) => void;
}
