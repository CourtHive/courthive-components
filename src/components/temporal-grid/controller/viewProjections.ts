/**
 * View Projections
 * 
 * Converts Temporal Grid Engine data structures into EventCalendar format.
 * This module is the translation layer between our domain model and the calendar UI.
 * 
 * Key Transformations:
 * - FacilityDayTimeline → Calendar Resources (courts grouped by facility)
 * - RailSegments → Calendar Events (background events showing availability)
 * - Blocks → Calendar Events (draggable, resizable)
 * 
 * Design: Pure functions, no side effects, testable in isolation.
 */

import type {
  BlockType,
  CourtMeta,
  CourtRef,
  FacilityDayTimeline,
  RailSegment,
} from '../engine/types';

// ============================================================================
// EventCalendar Type Definitions
// ============================================================================

/**
 * EventCalendar Resource (represents a court)
 */
export interface CalendarResource {
  id: string;
  title: string;
  groupId?: string; // For facility grouping
  extendedProps?: Record<string, any>;
}

/**
 * EventCalendar Event (represents a block or segment)
 */
export interface CalendarEvent {
  id: string;
  resourceId: string;
  start: string;
  end: string;
  title?: string;
  display?: 'auto' | 'background' | 'inverse-background' | 'none';
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  classNames?: string[];
  extendedProps?: Record<string, any>;
  editable?: boolean;
  startEditable?: boolean;
  durationEditable?: boolean;
}

/**
 * Grouping modes for resources
 */
export type ResourceGroupingMode = 'BY_FACILITY' | 'BY_SURFACE' | 'BY_TAG' | 'FLAT';

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
  AVAILABLE: 'transparent', // Transparent (inverted paradigm: default state, no visual needed)
  BLOCKED: '#95a5a6', // Gray
  PRACTICE: '#9b59b6', // Purple
  MAINTENANCE: '#f39c12', // Amber/Orange
  RESERVED: '#3498db', // Blue
  CLOSED: '#2c3e50', // Dark Gray/Blue (court closed)
  SCHEDULED: '#27ae60', // Green (tournament matches)
  SOFT_BLOCK: '#5dade2', // Light Blue
  HARD_BLOCK: '#e74c3c', // Red
  LOCKED: '#34495e', // Dark Gray
  UNSPECIFIED: '#ecf0f1', // Very Light Gray (gray fog)
};

// ============================================================================
// Resource Building
// ============================================================================

/**
 * Build calendar resources from facility timelines.
 * Converts courts into calendar resources, grouped by facility.
 * 
 * @param timelines - Facility day timelines from engine
 * @param courtMeta - Court metadata for additional properties
 * @param config - Projection configuration
 * @returns Array of calendar resources
 */
export function buildResourcesFromTimelines(
  timelines: FacilityDayTimeline[],
  courtMeta: CourtMeta[],
  config: ProjectionConfig = {},
): CalendarResource[] {
  const { groupingMode = 'BY_FACILITY' } = config;
  const resources: CalendarResource[] = [];

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

  // Build resources based on grouping mode
  for (const courtKeyStr of courts) {
    const meta = metaMap.get(courtKeyStr);
    if (!meta) continue;

    const resource: CalendarResource = {
      id: courtKeyStr,
      title: meta.name,
      extendedProps: {
        courtRef: meta.ref,
        surface: meta.surface,
        indoor: meta.indoor,
        hasLights: meta.hasLights,
        tags: meta.tags,
      },
    };

    // Set groupId based on grouping mode
    switch (groupingMode) {
      case 'BY_FACILITY':
        resource.groupId = meta.ref.facilityId;
        break;
      case 'BY_SURFACE':
        resource.groupId = meta.surface;
        break;
      case 'BY_TAG':
        resource.groupId = meta.tags[0] || 'untagged';
        break;
      case 'FLAT':
        // No grouping
        break;
    }

    resources.push(resource);
  }

  return resources;
}

/**
 * Build facility groups for resource grouping.
 * Creates group headers for EventCalendar.
 */
export function buildFacilityGroups(timelines: FacilityDayTimeline[]): CalendarResource[] {
  const facilities = new Set<string>();
  for (const timeline of timelines) {
    facilities.add(timeline.facilityId);
  }

  return Array.from(facilities).map((facilityId) => ({
    id: facilityId,
    title: facilityId, // Should be friendly name in production
    extendedProps: { isGroup: true },
  }));
}

// ============================================================================
// Event Building
// ============================================================================

/**
 * Build calendar events from facility timelines.
 * Converts rail segments into background events showing availability status.
 * 
 * @param timelines - Facility day timelines from engine
 * @param config - Projection configuration
 * @returns Array of calendar events
 */
export function buildEventsFromTimelines(
  timelines: FacilityDayTimeline[],
  config: ProjectionConfig = {},
): CalendarEvent[] {
  const {
    layerVisibility = new Map(),
    showSegmentLabels = false,
    colorScheme = DEFAULT_COLOR_SCHEME,
  } = config;

  const events: CalendarEvent[] = [];

  for (const timeline of timelines) {
    for (const rail of timeline.rails) {
      const resourceId = courtKey(rail.court);

      for (const segment of rail.segments) {
        // Check if this layer should be visible
        const isVisible = layerVisibility.get(segment.status) ?? true;
        if (!isVisible) continue;

        const eventId = `${resourceId}-${segment.start}-${segment.status}`;

        events.push({
          id: eventId,
          resourceId,
          start: segment.start,
          end: segment.end,
          title: showSegmentLabels ? formatSegmentLabel(segment) : undefined,
          display: 'background',
          backgroundColor: colorScheme[segment.status],
          classNames: [
            'temporal-segment',
            `segment-${segment.status.toLowerCase()}`,
          ],
          extendedProps: {
            status: segment.status,
            contributingBlocks: segment.contributingBlocks,
            isSegment: true,
          },
          editable: false, // Segments are not directly editable
        });
      }
    }
  }

  return events;
}

/**
 * Format a segment label for display
 */
function formatSegmentLabel(segment: RailSegment): string {
  const duration = Math.round(
    (new Date(segment.end).getTime() - new Date(segment.start).getTime()) / (1000 * 60),
  );
  return `${segment.status} (${duration}m)`;
}

// ============================================================================
// Block Event Building
// ============================================================================

/**
 * Build draggable/editable block events.
 * These represent user-created blocks that can be moved and resized.
 * 
 * @param blocks - Array of blocks to render
 * @param config - Projection configuration
 * @returns Array of calendar events
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
  config: ProjectionConfig = {},
): CalendarEvent[] {
  const { colorScheme = DEFAULT_COLOR_SCHEME } = config;
  const events: CalendarEvent[] = [];

  for (const block of blocks) {
    const resourceId = courtKey(block.court);

    events.push({
      id: `block-${block.id}`,
      resourceId,
      start: block.start,
      end: block.end,
      title: block.reason || block.type,
      display: 'auto', // Regular event display (not background)
      backgroundColor: colorScheme[block.type],
      borderColor: adjustColorBrightness(colorScheme[block.type], -20),
      classNames: ['temporal-block', `block-${block.type.toLowerCase()}`],
      extendedProps: {
        blockId: block.id,
        status: block.type,
        reason: block.reason,
        isBlock: true,
      },
      // Enable dragging and resizing
      editable: true,
      startEditable: true,
      durationEditable: true,
      resourceEditable: true,
    });
  }

  return events;
}

// ============================================================================
// Conflict Visualization
// ============================================================================

/**
 * Build visual indicators for conflicts.
 * Creates overlay events showing where conflicts exist.
 */
export function buildConflictEvents(
  conflicts: Array<{
    code: string;
    message: string;
    severity: 'ERROR' | 'WARN' | 'INFO';
    timeRange: { start: string; end: string };
    courts: CourtRef[];
  }>,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const conflict of conflicts) {
    for (const court of conflict.courts) {
      const resourceId = courtKey(court);

      // Choose color based on severity
      const color = conflict.severity === 'ERROR' ? '#e74c3c' : 
                    conflict.severity === 'WARN' ? '#f39c12' : '#3498db';

      events.push({
        id: `conflict-${conflict.code}-${resourceId}`,
        resourceId,
        start: conflict.timeRange.start,
        end: conflict.timeRange.end,
        title: conflict.message,
        display: 'inverse-background',
        backgroundColor: color,
        classNames: [
          'temporal-conflict',
          `conflict-${conflict.severity.toLowerCase()}`,
        ],
        extendedProps: {
          conflictCode: conflict.code,
          severity: conflict.severity,
          message: conflict.message,
          isConflict: true,
        },
        editable: false,
      });
    }
  }

  return events;
}

// ============================================================================
// Filtering & Transformation
// ============================================================================

/**
 * Filter events by time range
 */
export function filterEventsByTimeRange(
  events: CalendarEvent[],
  timeRange: { start: string; end: string },
): CalendarEvent[] {
  return events.filter(
    (event) => event.start < timeRange.end && event.end > timeRange.start,
  );
}

/**
 * Filter resources by facility
 */
export function filterResourcesByFacility(
  resources: CalendarResource[],
  facilityId: string,
): CalendarResource[] {
  return resources.filter((resource) => resource.groupId === facilityId);
}

/**
 * Sort resources by court name
 */
export function sortResources(resources: CalendarResource[]): CalendarResource[] {
  return resources.slice().sort((a, b) => a.title.localeCompare(b.title));
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
  }>,
): Array<{ time: string; value: number; label: string }> {
  return capacityPoints.map((point) => ({
    time: point.time,
    value: point.courtsAvailable,
    label: `${point.courtsAvailable} courts available`,
  }));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique court key for resource/event IDs
 */
function courtKey(court: CourtRef): string {
  return `${court.tournamentId}|${court.facilityId}|${court.courtId}`;
}

/**
 * Adjust color brightness for borders
 */
function adjustColorBrightness(color: string, percent: number): string {
  // Simple brightness adjustment (for hex colors)
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
 * Parse resource ID back to court reference
 */
export function parseResourceId(resourceId: string): CourtRef | null {
  const parts = resourceId.split('|');
  if (parts.length !== 3) return null;

  return {
    tournamentId: parts[0],
    facilityId: parts[1],
    courtId: parts[2],
  };
}

/**
 * Parse event ID to extract block ID
 */
export function parseBlockEventId(eventId: string): string | null {
  if (eventId.startsWith('block-')) {
    return eventId.slice(6); // Remove 'block-' prefix
  }
  return null;
}

/**
 * Check if an event is a segment (background) or block (editable)
 */
export function isSegmentEvent(event: CalendarEvent): boolean {
  return event.extendedProps?.isSegment === true;
}

export function isBlockEvent(event: CalendarEvent): boolean {
  return event.extendedProps?.isBlock === true;
}

export function isConflictEvent(event: CalendarEvent): boolean {
  return event.extendedProps?.isConflict === true;
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
    /* Available - solid */
    .segment-available {
      opacity: 0.3;
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
// Time Slot Configuration
// ============================================================================

/**
 * Build time slot configuration for calendar
 */
export function buildTimeSlotConfig(config: {
  dayStartTime: string;
  dayEndTime: string;
  slotMinutes: number;
}): {
  slotDuration: string;
  slotMinTime: string;
  slotMaxTime: string;
} {
  // Convert minutes to duration string (HH:MM:SS or HH:MM)
  const hours = Math.floor(config.slotMinutes / 60);
  const minutes = config.slotMinutes % 60;
  const slotDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return {
    slotDuration,
    slotMinTime: config.dayStartTime,
    slotMaxTime: config.dayEndTime,
  };
}
