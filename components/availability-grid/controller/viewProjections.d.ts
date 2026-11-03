import { availability } from 'tods-competition-factory';
type BlockType = availability.BlockType;
type CourtMeta = availability.CourtMeta;
type CourtRef = availability.CourtRef;
type VenueDayTimeline = availability.VenueDayTimeline;
/**
 * Timeline Group (represents a court or facility group header)
 */
export interface TimelineGroup {
    id: string;
    content: string;
    nestedGroups?: string[];
    showNested?: boolean;
    className?: string;
    title?: string;
    order?: number;
    visible?: boolean;
    courtRef?: CourtRef;
    surface?: string;
    indoor?: boolean;
    hasLights?: boolean;
    tags?: string[];
    isGroup?: boolean;
}
/**
 * Timeline Item (represents a block or segment)
 */
export interface TimelineItem {
    id: string;
    group: string;
    content: string;
    start: Date | string;
    end?: Date | string;
    type?: 'box' | 'point' | 'range' | 'background';
    className?: string;
    style?: string;
    title?: string;
    editable?: boolean | {
        updateTime?: boolean;
        updateGroup?: boolean;
        remove?: boolean;
    };
    selectable?: boolean;
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
export declare const DEFAULT_COLOR_SCHEME: BlockColorScheme;
/**
 * Build timeline groups from facility timelines.
 * Converts courts into timeline groups, grouped by facility.
 */
export declare function buildResourcesFromTimelines(timelines: VenueDayTimeline[], courtMeta: CourtMeta[], _config?: ProjectionConfig): TimelineGroup[];
/**
 * Build venue group headers for nested grouping.
 * Creates group headers for CourtTimeline.
 */
export declare function buildVenueGroups(timelines: VenueDayTimeline[]): TimelineGroup[];
/**
 * Build timeline items from facility timelines.
 * Converts rail segments into background items showing availability status.
 */
export declare function buildEventsFromTimelines(timelines: VenueDayTimeline[], config?: ProjectionConfig): TimelineItem[];
/**
 * Build draggable/editable block items.
 * These represent user-created blocks that can be moved and resized.
 */
export declare function buildBlockEvents(blocks: Array<{
    id: string;
    court: CourtRef;
    start: string;
    end: string;
    type: BlockType;
    reason?: string;
}>, config?: ProjectionConfig): TimelineItem[];
/**
 * Build visual indicators for conflicts.
 * Creates overlay items showing where conflicts exist.
 */
export declare function buildConflictEvents(conflicts: Array<{
    code: string;
    message: string;
    severity: 'ERROR' | 'WARN' | 'INFO';
    timeRange: {
        start: string;
        end: string;
    };
    courts: CourtRef[];
}>): TimelineItem[];
/**
 * Filter items by time range
 */
export declare function filterEventsByTimeRange(events: TimelineItem[], timeRange: {
    start: string;
    end: string;
}): TimelineItem[];
/**
 * Filter groups by facility
 */
export declare function filterResourcesByVenue(resources: TimelineGroup[], venueId: string): TimelineGroup[];
/**
 * Sort groups by court name
 */
export declare function sortResources(resources: TimelineGroup[]): TimelineGroup[];
/**
 * Build capacity curve visualization.
 * Creates a visual representation of courts available over time.
 */
export declare function buildCapacityVisualization(capacityPoints: Array<{
    time: string;
    courtsAvailable: number;
    courtsSoftBlocked: number;
    courtsHardBlocked: number;
}>): Array<{
    time: string;
    value: number;
    label: string;
}>;
/**
 * Parse group ID back to court reference
 */
export declare function parseResourceId(resourceId: string): CourtRef | null;
/**
 * Parse item ID to extract block ID
 */
export declare function parseBlockEventId(eventId: string): string | null;
/**
 * Check if an item is a segment (background) or block (editable)
 */
export declare function isSegmentEvent(event: TimelineItem): boolean;
export declare function isBlockEvent(event: TimelineItem): boolean;
export declare function isConflictEvent(event: TimelineItem): boolean;
/**
 * Generate CSS patterns for different block types
 * (stripes, dots, hatching, etc.)
 */
export declare function generateBlockPatternCSS(): string;
/**
 * Build timeline window configuration
 */
export declare function buildTimelineWindowConfig(config: {
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
};
/**
 * Build hidden date ranges to collapse overnight gaps.
 * Uses `repeat: 'daily'` so the gap is hidden every day in a multi-day view.
 */
export declare function buildHiddenDates(config: {
    dayStartTime: string;
    dayEndTime: string;
    referenceDay: string;
    bufferMinutes?: number;
}): Array<{
    start: Date;
    end: Date;
    repeat: 'daily' | 'weekly' | 'monthly' | 'yearly';
}>;
/**
 * @deprecated Use buildTimelineWindowConfig instead
 */
export declare function buildTimeSlotConfig(config: {
    dayStartTime: string;
    dayEndTime: string;
    slotMinutes: number;
}): {
    slotDuration: string;
    slotMinTime: string;
    slotMaxTime: string;
};
export {};
