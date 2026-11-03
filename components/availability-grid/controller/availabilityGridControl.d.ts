import { availability, AvailabilityEngine } from 'tods-competition-factory';
import { BlockPopoverManager } from '../ui/blockPopover';
import { AvailabilityViewState } from '../engine/viewState';
import { CourtTimeline } from '../timeline/CourtTimeline';
import { DEFAULT_COLOR_SCHEME, ResourceGroupingMode } from './viewProjections';
type BlockType = availability.BlockType;
type CourtRef = availability.CourtRef;
type DayId = availability.DayId;
export interface AvailabilityGridControlConfig {
    /** Container element for the timeline */
    container: HTMLElement;
    /** Initial selected day */
    initialDay?: DayId;
    /** Initial view mode */
    initialView?: 'day' | 'week';
    /** Resource grouping mode */
    groupingMode?: ResourceGroupingMode;
    /** Whether to show conflict indicators */
    showConflicts?: boolean;
    /** Whether segments should have labels */
    showSegmentLabels?: boolean;
    /** Custom color scheme */
    colorScheme?: typeof DEFAULT_COLOR_SCHEME;
    /** Callback when a block is selected */
    onBlockSelected?: (blockId: string) => void;
    /** Callback when a court is selected */
    onCourtSelected?: (court: CourtRef) => void;
    /** Callback when time range is selected */
    onTimeRangeSelected?: (params: {
        courts: CourtRef[];
        start: string;
        end: string;
    }) => void;
    /** Callback when engine blocks change (for stats bar, external consumers) */
    onBlocksChanged?: () => void;
    /** Callback when a day label is double-clicked (for navigating to 1-Day view) */
    onDayNavigate?: (day: string) => void;
    /**
     * Callback invoked when an action can't complete because of scheduling
     * conflicts. The controller never opens a dialog itself — the consumer
     * wires this hook to its own themed-toast / modal system. When omitted,
     * conflicts are written to console.warn only (NEVER falls back to a
     * native browser alert).
     */
    onConflict?: (conflicts: any[]) => void;
    /**
     * Optional callback rendered as a "Manage Registrations" menu item on
     * the block popover for PRACTICE blocks. The argument carries the
     * resolved block descriptor — consumers use it to open their practice-
     * registration management surface (e.g. a cModal in TMX).
     */
    onManageRegistrations?: (args: {
        blockId: string;
        courtId: string;
        venueId: string;
        date: string;
        startTime: string;
        endTime: string;
    }) => void;
}
export declare class AvailabilityGridControl {
    private readonly engine;
    private timeline;
    private disposed;
    private mountTimer;
    private popoverTimer;
    private readonly config;
    private unsubscribe;
    private currentItems;
    private isRendering;
    private popoverManager;
    private viewState;
    private currentDay;
    private currentView;
    private selectedCourts;
    private visibleCourts;
    constructor(engine: AvailabilityEngine, config: AvailabilityGridControlConfig);
    private initialize;
    /**
     * Ensure timeline exists. Defers creation to the next macro-task so the
     * container has layout dimensions (matches the working story pattern).
     */
    private ensureTimeline;
    /**
     * Build the current view data from the engine.
     */
    /**
     * Get the list of days visible in the current view.
     */
    getViewDays(): string[];
    private buildViewData;
    /**
     * Create the timeline with initial data already populated.
     */
    private createTimelineWithData;
    /** Set the selected day (public API) */
    setDay(day: DayId): void;
    /** Get current selected day */
    getDay(): DayId | null;
    /** Set view mode */
    setView(view: string): void;
    /** Set a named view preset (day/days3/week/all) */
    setViewPreset(viewKey: string): void;
    /** Select courts for multi-court operations */
    setSelectedCourts(courts: CourtRef[]): void;
    /** Get selected courts */
    getSelectedCourts(): CourtRef[];
    /** Set which courts are visible in the timeline */
    setVisibleCourts(courts: Set<string> | null): void;
    /** Set layer visibility */
    setLayerVisibility(layerId: BlockType, visible: boolean): void;
    /** Refresh the calendar display */
    refresh(): void;
    /** Destroy the controller and cleanup */
    destroy(): void;
    private updateTimelineWindow;
    private render;
    /**
     * onMove: Called when user finishes dragging or resizing an item.
     * Returns true to accept, false to reject.
     */
    private handleOnMove;
    /**
     * onMoving: Live validation during drag (optional visual feedback).
     * Destroys active popover, clamps to court availability.
     * Returns clamped start/end, or null to reject.
     */
    private handleOnMoving;
    /**
     * Timeline click handler: Routes to popover based on item type.
     * Handles ghost confirmation (multi-row create) and block click → popover.
     */
    private handleTimelineClick;
    /**
     * Multi-row ghost creation handler.
     * Called when user confirms a ghost spanning one or more court rows.
     * Creates one block per court via engine.applyBlock.
     */
    private handleMultiRowCreate;
    /** Get the popover manager (for external access) */
    getPopoverManager(): BlockPopoverManager;
    private handleEngineEvent;
    /** Snap a date to the nearest N-minute increment */
    private snapToMinutes;
    /**
     * Format a Date as a local-time ISO string (no timezone offset).
     * Engine stores times as wall-clock strings like "2026-06-15T09:00:00".
     * toISOString() converts to UTC which shifts the time by the local offset.
     */
    private toLocalISO;
    /**
     * Surface scheduling conflicts to the consumer. We never open a dialog
     * here — the consumer's `onConflict` hook routes them to whatever themed
     * notification system the host app uses (TMX toast, AMS console modal,
     * etc.). When no hook is wired, conflicts go to console.warn only.
     */
    private showConflictDialog;
    /** Get timeline instance (for advanced usage) */
    getTimeline(): CourtTimeline | null;
    /** Get engine instance */
    getEngine(): AvailabilityEngine;
    /** Get view state (for external consumers to subscribe to view changes) */
    getViewState(): AvailabilityViewState;
}
/** Create a availability grid controller */
export declare function createAvailabilityGridControl(engine: AvailabilityEngine, config: AvailabilityGridControlConfig): AvailabilityGridControl;
export {};
