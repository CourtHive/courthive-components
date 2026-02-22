/**
 * View Projections
 *
 * Converts Temporal Grid Engine data structures into vis-timeline format.
 * This module is the translation layer between our domain model and the timeline UI.
 *
 * Key Transformations:
 * - VenueDayTimeline → TimelineGroup (courts grouped by venue)
 * - RailSegments → TimelineItem (background items showing availability)
 * - Blocks → TimelineItem (draggable, resizable range items)
 *
 * Design: Pure functions, no side effects, testable in isolation.
 */

import type { BlockType, CourtMeta, CourtRef, VenueDayTimeline, RailSegment } from '../engine/types';

import type { IdType } from 'vis-timeline/standalone';

// ============================================================================
// Timeline Type Definitions (vis-timeline compatible)
// ============================================================================

/**
 * vis-timeline Group (represents a court or facility group header)
 */
export interface TimelineGroup {
  id: IdType;
  content: string;
  nestedGroups?: IdType[];
  showNested?: boolean;
  className?: string;
  title?: string;
  order?: number;
  visible?: boolean;
  // Extended properties (not native vis-timeline, but we store them on group objects)
  courtRef?: CourtRef;
  surface?: string;
  indoor?: boolean;
  hasLights?: boolean;
  tags?: string[];
  isGroup?: boolean;
}

/**
 * vis-timeline Item (represents a block or segment)
 */
export interface TimelineItem {
  id: IdType;
  group: IdType;
  content: string;
  start: Date | string;
  end?: Date | string;
  type?: 'box' | 'point' | 'range' | 'background';
  className?: string;
  style?: string;
  title?: string;
  editable?: boolean | { updateTime?: boolean; updateGroup?: boolean; remove?: boolean };
  selectable?: boolean;
  // Extended properties for domain data
  blockId?: string;
  status?: string;
  reason?: string;
  isBlock?: boolean;
  isSegment?: boolean;
  isConflict?: boolean;
  conflictCode?: string;
  severity?: string;
  message?: string;
  contributingBlocks?: string[];
}

// ============================================================================
// Backward Compatibility Aliases (deprecated)
// ============================================================================

/** @deprecated Use TimelineGroup instead */
export type CalendarResource = TimelineGroup;
/** @deprecated Use TimelineItem instead */
export type CalendarEvent = TimelineItem;

/**
 * Grouping modes for resources
 */
export type ResourceGroupingMode = 'BY_VENUE' | 'BY_SURFACE' | 'BY_TAG' | 'FLAT';

/**
 * Configuration for view projections
 */
export interface ProjectionConfig {
  groupingMode?: ResourceGroupingMode;
  layerVisibility?: Map<BlockType, boolean>;
  showSegmentLabels?: boolean;
  colorScheme?: BlockColorScheme;
}

/**
 * Color scheme for block types
 */
export interface BlockColorScheme {
  AVAILABLE: string;
  BLOCKED: string;
  PRACTICE: string;
  MAINTENANCE: string;
  RESERVED: string;
  CLOSED: string;
  SCHEDULED: string;
  SOFT_BLOCK: string;
  HARD_BLOCK: string;
  LOCKED: string;
  UNSPECIFIED: string;
}

// ============================================================================
// Default Color Scheme
// ============================================================================

export const DEFAULT_COLOR_SCHEME: BlockColorScheme = {
  AVAILABLE: 'rgba(33, 141, 141, 0.15)', // Barely-there teal tint; consumers can override via colorScheme
  BLOCKED: '#95a5a6', // Gray
  PRACTICE: '#9b59b6', // Purple
  MAINTENANCE: '#f39c12', // Amber/Orange
  RESERVED: '#3498db', // Blue
  CLOSED: '#2c3e50', // Dark Gray/Blue (court closed)
  SCHEDULED: '#27ae60', // Green (tournament matches)
  SOFT_BLOCK: '#5dade2', // Light Blue
  HARD_BLOCK: '#e74c3c', // Red
  LOCKED: '#34495e', // Dark Gray
  UNSPECIFIED: '#ecf0f1' // Very Light Gray (gray fog)
};

// ============================================================================
// Group Building (replaces Resource Building)
// ============================================================================

/**
 * Build timeline groups from facility timelines.
 * Converts courts into vis-timeline groups, grouped by facility.
 */
export function buildResourcesFromTimelines(
  timelines: VenueDayTimeline[],
  courtMeta: CourtMeta[],
  _config: ProjectionConfig = {}
): TimelineGroup[] {
  const groups: TimelineGroup[] = [];

  // Create a map of court metadata for quick lookup
  const metaMap = new Map<string, CourtMeta>();
  for (const meta of courtMeta) {
    const key = courtKey(meta.ref);
    metaMap.set(key, meta);
  }

  // Collect all courts from timelines
  const courts = new Set<string>();
  for (const timeline of timelines) {
    for (const rail of timeline.rails) {
      courts.add(courtKey(rail.court));
    }
  }

  // Build groups based on grouping mode
  for (const courtKeyStr of courts) {
    const meta = metaMap.get(courtKeyStr);
    if (!meta) continue;

    const group: TimelineGroup = {
      id: courtKeyStr,
      content: meta.name,
      courtRef: meta.ref,
      surface: meta.surface,
      indoor: meta.indoor,
      hasLights: meta.hasLights,
      tags: meta.tags
    };

    // Set nestedGroups grouping based on mode
    // (nestedInGroup is set on facility group headers, not on courts)
    groups.push(group);
  }

  return groups;
}

/**
 * Build venue group headers for nested grouping.
 * Creates group headers for vis-timeline.
 */
export function buildVenueGroups(timelines: VenueDayTimeline[]): TimelineGroup[] {
  const venues = new Map<string, Set<string>>();

  // Collect all courts per venue
  for (const timeline of timelines) {
    if (!venues.has(timeline.venueId)) {
      venues.set(timeline.venueId, new Set());
    }
    for (const rail of timeline.rails) {
      venues.get(timeline.venueId)!.add(courtKey(rail.court));
    }
  }

  return Array.from(venues.entries()).map(([venueId, courtKeys]) => ({
    id: venueId,
    content: venueId,
    nestedGroups: Array.from(courtKeys),
    showNested: true,
    isGroup: true
  }));
}

// ============================================================================
// Item Building (replaces Event Building)
// ============================================================================

/**
 * Build timeline items from facility timelines.
 * Converts rail segments into background items showing availability status.
 */
export function buildEventsFromTimelines(
  timelines: VenueDayTimeline[],
  config: ProjectionConfig = {}
): TimelineItem[] {
  const { layerVisibility = new Map(), showSegmentLabels = false, colorScheme = DEFAULT_COLOR_SCHEME } = config;

  const items: TimelineItem[] = [];

  for (const timeline of timelines) {
    for (const rail of timeline.rails) {
      const groupId = courtKey(rail.court);

      for (const segment of rail.segments) {
        // Check if this layer should be visible
        const isVisible = layerVisibility.get(segment.status) ?? true;
        if (!isVisible) continue;

        const itemId = `${groupId}-${segment.start}-${segment.status}`;
        const color = colorScheme[segment.status];

        items.push({
          id: itemId,
          group: groupId,
          content: showSegmentLabels ? formatSegmentLabel(segment) : '',
          start: segment.start,
          end: segment.end,
          type: 'background',
          className: `temporal-segment segment-${segment.status.toLowerCase()}`,
          style: color !== 'transparent' ? `background-color: ${color};` : undefined,
          title: `${segment.status} segment`,
          editable: false,
          selectable: false,
          status: segment.status,
          contributingBlocks: segment.contributingBlocks,
          isSegment: true
        });
      }
    }
  }

  return items;
}

/**
 * Format a segment label for display
 */
function formatSegmentLabel(segment: RailSegment): string {
  const duration = Math.round((new Date(segment.end).getTime() - new Date(segment.start).getTime()) / (1000 * 60));
  return `${segment.status} (${duration}m)`;
}

// ============================================================================
// Block Item Building
// ============================================================================

/**
 * Build draggable/editable block items.
 * These represent user-created blocks that can be moved and resized.
 */
export function buildBlockEvents(
  blocks: Array<{
    id: string;
    court: CourtRef;
    start: string;
    end: string;
    type: BlockType;
    reason?: string;
  }>,
  config: ProjectionConfig = {}
): TimelineItem[] {
  const { colorScheme = DEFAULT_COLOR_SCHEME } = config;
  const items: TimelineItem[] = [];

  for (const block of blocks) {
    const groupId = courtKey(block.court);
    const color = colorScheme[block.type];
    const borderColor = adjustColorBrightness(color, -20);

    items.push({
      id: `block-${block.id}`,
      group: groupId,
      content: block.reason || block.type,
      start: block.start,
      end: block.end,
      type: 'range',
      className: `temporal-block block-${block.type.toLowerCase()}`,
      style: `background-color: ${color}; border-color: ${borderColor};`,
      title: block.reason || block.type,
      editable: { updateTime: true, updateGroup: true, remove: false },
      blockId: block.id,
      status: block.type,
      reason: block.reason,
      isBlock: true
    });
  }

  return items;
}

// ============================================================================
// Conflict Visualization
// ============================================================================

/**
 * Build visual indicators for conflicts.
 * Creates overlay items showing where conflicts exist.
 */
export function buildConflictEvents(
  conflicts: Array<{
    code: string;
    message: string;
    severity: 'ERROR' | 'WARN' | 'INFO';
    timeRange: { start: string; end: string };
    courts: CourtRef[];
  }>
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const conflict of conflicts) {
    for (const court of conflict.courts) {
      const groupId = courtKey(court);

      items.push({
        id: `conflict-${conflict.code}-${groupId}`,
        group: groupId,
        content: conflict.message,
        start: conflict.timeRange.start,
        end: conflict.timeRange.end,
        type: 'background',
        className: `temporal-conflict conflict-${conflict.severity.toLowerCase()}`,
        title: conflict.message,
        editable: false,
        selectable: false,
        conflictCode: conflict.code,
        severity: conflict.severity,
        message: conflict.message,
        isConflict: true
      });
    }
  }

  return items;
}

// ============================================================================
// Filtering & Transformation
// ============================================================================

/**
 * Filter items by time range
 */
export function filterEventsByTimeRange(
  events: TimelineItem[],
  timeRange: { start: string; end: string }
): TimelineItem[] {
  return events.filter((event) => {
    const eventStart = typeof event.start === 'string' ? event.start : event.start.toISOString();
    const eventEnd = event.end ? (typeof event.end === 'string' ? event.end : event.end.toISOString()) : eventStart;
    return eventStart < timeRange.end && eventEnd > timeRange.start;
  });
}

/**
 * Filter groups by facility
 */
export function filterResourcesByVenue(resources: TimelineGroup[], venueId: string): TimelineGroup[] {
  return resources.filter((resource) => {
    return resource.courtRef?.venueId === venueId;
  });
}

/**
 * Sort groups by court name
 */
export function sortResources(resources: TimelineGroup[]): TimelineGroup[] {
  return resources.slice().sort((a, b) => {
    const contentA = typeof a.content === 'string' ? a.content : '';
    const contentB = typeof b.content === 'string' ? b.content : '';
    return contentA.localeCompare(contentB);
  });
}

// ============================================================================
// Capacity Visualization
// ============================================================================

/**
 * Build capacity curve visualization.
 * Creates a visual representation of courts available over time.
 */
export function buildCapacityVisualization(
  capacityPoints: Array<{
    time: string;
    courtsAvailable: number;
    courtsSoftBlocked: number;
    courtsHardBlocked: number;
  }>
): Array<{ time: string; value: number; label: string }> {
  return capacityPoints.map((point) => ({
    time: point.time,
    value: point.courtsAvailable,
    label: `${point.courtsAvailable} courts available`
  }));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique court key for group/item IDs
 */
function courtKey(court: CourtRef): string {
  return `${court.tournamentId}|${court.venueId}|${court.courtId}`;
}

/**
 * Adjust color brightness for borders
 */
function adjustColorBrightness(color: string, percent: number): string {
  // Simple brightness adjustment (for hex colors)
  if (!color || !color.startsWith('#')) return color;
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

/**
 * Parse group ID back to court reference
 */
export function parseResourceId(resourceId: string): CourtRef | null {
  const parts = resourceId.split('|');
  if (parts.length !== 3) return null;

  return {
    tournamentId: parts[0],
    venueId: parts[1],
    courtId: parts[2]
  };
}

/**
 * Parse item ID to extract block ID
 */
export function parseBlockEventId(eventId: string): string | null {
  const strId = String(eventId);
  if (strId.startsWith('block-')) {
    return strId.slice(6); // Remove 'block-' prefix
  }
  return null;
}

/**
 * Check if an item is a segment (background) or block (editable)
 */
export function isSegmentEvent(event: TimelineItem): boolean {
  return event.isSegment === true;
}

export function isBlockEvent(event: TimelineItem): boolean {
  return event.isBlock === true;
}

export function isConflictEvent(event: TimelineItem): boolean {
  return event.isConflict === true;
}

// ============================================================================
// CSS Pattern Generation
// ============================================================================

/**
 * Generate CSS patterns for different block types
 * (stripes, dots, hatching, etc.)
 */
export function generateBlockPatternCSS(): string {
  return `
    /* Available - near-transparent tint */
    .segment-available {
    }

    /* Blocked - diagonal lines */
    .segment-blocked {
      background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(0, 0, 0, 0.1) 10px,
        rgba(0, 0, 0, 0.1) 20px
      );
    }

    /* Practice - horizontal stripes */
    .segment-practice {
      background-image: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 5px,
        rgba(255, 255, 255, 0.2) 5px,
        rgba(255, 255, 255, 0.2) 10px
      );
    }

    /* Maintenance - dots */
    .segment-maintenance {
      background-image: radial-gradient(
        circle,
        rgba(0, 0, 0, 0.2) 1px,
        transparent 1px
      );
      background-size: 10px 10px;
    }

    /* Hard Block - solid with border */
    .segment-hard_block {
      opacity: 0.9;
      border: 2px solid rgba(0, 0, 0, 0.3);
    }

    /* Soft Block - semi-transparent */
    .segment-soft_block {
      opacity: 0.5;
    }

    /* Unspecified - gray fog */
    .segment-unspecified {
      opacity: 0.15;
    }

    /* Conflict indicators */
    .temporal-conflict {
      opacity: 0.4;
      pointer-events: none;
    }

    .conflict-error {
      border: 2px dashed #e74c3c;
    }

    .conflict-warn {
      border: 2px dashed #f39c12;
    }

    .conflict-info {
      border: 2px dashed #3498db;
    }
  `;
}

// ============================================================================
// Timeline Window Configuration (replaces buildTimeSlotConfig)
// ============================================================================

/**
 * Build timeline window configuration for vis-timeline
 */
export function buildTimelineWindowConfig(config: {
  dayStartTime: string;
  dayEndTime: string;
  slotMinutes: number;
  day: string;
}): {
  start: Date;
  end: Date;
  min: Date;
  max: Date;
  zoomMin: number;
  zoomMax: number;
} {
  const start = new Date(`${config.day}T${config.dayStartTime}:00`);
  const end = new Date(`${config.day}T${config.dayEndTime}:00`);

  // zoomMin: minimum visible range (slotMinutes * 4 slots worth of ms)
  const zoomMin = config.slotMinutes * 4 * 60 * 1000;
  // zoomMax: maximum visible range (full day + buffer)
  const zoomMax = (end.getTime() - start.getTime()) * 1.5;

  return {
    start,
    end,
    min: start,
    max: end,
    zoomMin,
    zoomMax
  };
}

/**
 * Build hidden date ranges for vis-timeline to collapse overnight gaps.
 * Uses `repeat: 'daily'` so the gap is hidden every day in a multi-day view.
 */
export function buildHiddenDates(config: {
  dayStartTime: string; // earliest court open across all days/courts (e.g. '08:00')
  dayEndTime: string; // latest court close across all days/courts (e.g. '20:00')
  referenceDay: string; // any tournament day (YYYY-MM-DD), used as anchor
  bufferMinutes?: number; // minutes of padding outside availability (default 30)
}): Array<{ start: Date; end: Date; repeat: 'daily' | 'weekly' | 'monthly' | 'yearly' }> {
  const buffer = config.bufferMinutes ?? 30;

  // Parse HH:MM into total minutes since midnight
  const [startH, startM] = config.dayStartTime.split(':').map(Number);
  const [endH, endM] = config.dayEndTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Apply buffer: show a bit before open and a bit after close
  const bufferedStartMinutes = Math.max(0, startMinutes - buffer);
  const bufferedEndMinutes = Math.min(24 * 60, endMinutes + buffer);

  // If buffered range covers the full day (or nearly), no gap to hide
  if (bufferedEndMinutes >= bufferedStartMinutes + 24 * 60 - 1) return [];
  // If end meets or exceeds next-day start (gap vanishes), return empty
  if (bufferedEndMinutes >= 24 * 60 && bufferedStartMinutes <= 0) return [];

  // Build gap: from bufferedEnd on referenceDay to bufferedStart on referenceDay+1
  const refDate = new Date(`${config.referenceDay}T00:00:00`);

  const gapStart = new Date(refDate);
  gapStart.setMinutes(bufferedEndMinutes);

  const gapEnd = new Date(refDate);
  gapEnd.setDate(gapEnd.getDate() + 1);
  gapEnd.setMinutes(bufferedStartMinutes);

  // If gap start >= gap end, the gap is zero or negative — nothing to hide
  if (gapStart >= gapEnd) return [];

  return [{ start: gapStart, end: gapEnd, repeat: 'daily' }];
}

/**
 * @deprecated Use buildTimelineWindowConfig instead
 */
export function buildTimeSlotConfig(config: { dayStartTime: string; dayEndTime: string; slotMinutes: number }): {
  slotDuration: string;
  slotMinTime: string;
  slotMaxTime: string;
} {
  const hours = Math.floor(config.slotMinutes / 60);
  const minutes = config.slotMinutes % 60;
  const slotDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return {
    slotDuration,
    slotMinTime: config.dayStartTime,
    slotMaxTime: config.dayEndTime
  };
}
