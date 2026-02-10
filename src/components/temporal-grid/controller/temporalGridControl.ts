/**
 * Temporal Grid Controller
 *
 * Manages the EventCalendar instance and wires it to the Temporal Grid Engine.
 * Following the TMX controlBar pattern: engine handles state, controller handles UI.
 *
 * Responsibilities:
 * - Create and configure EventCalendar
 * - Convert engine data → calendar format
 * - Handle user interactions → engine commands
 * - Subscribe to engine events → update calendar
 * - Manage view state (selected day, facility, etc.)
 *
 * Design: Stateful controller, but all domain logic stays in engine.
 */

import { createCalendar, destroyCalendar, ResourceTimeline, type Calendar } from '@event-calendar/core';
import { tools } from 'tods-competition-factory';
import type { TemporalGridEngine } from '../engine/temporalGridEngine';
import { clampDragToCollisions, findBlocksContainingTime, sortBlocksByStart } from '../engine/collisionDetection';
import type { BlockType, CourtRef, DayId } from '../engine/types';
import {
  buildBlockEvents,
  buildEventsFromTimelines,
  buildResourcesFromTimelines,
  buildTimeSlotConfig,
  DEFAULT_COLOR_SCHEME,
  parseBlockEventId,
  parseResourceId,
  type CalendarEvent,
  type CalendarResource,
  type ProjectionConfig,
  type ResourceGroupingMode
} from './viewProjections';
import { showModernTimePicker } from '../ui/modernTimePicker';

// ============================================================================
// Controller Configuration
// ============================================================================

export interface TemporalGridControlConfig {
  /**
   * Container element for the calendar
   */
  container: HTMLElement;

  /**
   * Initial selected day
   */
  initialDay?: DayId;

  /**
   * Initial view mode
   */
  initialView?: 'resourceTimelineDay' | 'resourceTimelineWeek';

  /**
   * Resource grouping mode
   */
  groupingMode?: ResourceGroupingMode;

  /**
   * Whether to show conflict indicators
   */
  showConflicts?: boolean;

  /**
   * Whether segments should have labels
   */
  showSegmentLabels?: boolean;

  /**
   * Custom color scheme
   */
  colorScheme?: typeof DEFAULT_COLOR_SCHEME;

  /**
   * Callback when a block is selected
   */
  onBlockSelected?: (blockId: string) => void;

  /**
   * Callback when a court is selected
   */
  onCourtSelected?: (court: CourtRef) => void;

  /**
   * Callback when time range is selected (for painting)
   */
  onTimeRangeSelected?: (params: { courts: CourtRef[]; start: string; end: string }) => void;
}

// ============================================================================
// Temporal Grid Controller
// ============================================================================

export class TemporalGridControl {
  private readonly engine: TemporalGridEngine;
  private calendar: Calendar | null = null;
  private readonly config: TemporalGridControlConfig;
  private unsubscribe: (() => void) | null = null;

  // View state
  private currentDay: DayId | null = null;
  private currentView: 'resourceTimelineDay' | 'resourceTimelineWeek' = 'resourceTimelineDay';
  private selectedCourts: Set<CourtRef> = new Set();
  private currentPaintType: BlockType | 'DELETE' = 'BLOCKED';
  private isPaintMode = false;
  private visibleCourts: Set<string> | null = null; // null = all visible, Set = filtered
  private paintDragStart: { x: number; y: number; resourceId: string | null } | null = null;
  private currentResources: CalendarResource[] = []; // Cache for paint mode resource lookup
  private paintSelectionOverlay: HTMLElement | null = null; // Visual feedback during drag

  constructor(engine: TemporalGridEngine, config: TemporalGridControlConfig) {
    this.engine = engine;
    this.config = {
      groupingMode: 'BY_FACILITY',
      showConflicts: true,
      showSegmentLabels: false,
      colorScheme: DEFAULT_COLOR_SCHEME,
      ...config
    };

    this.initialize();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initialize(): void {
    console.log('[Controller] Initialize - config.initialView:', this.config.initialView);
    
    // Set initial day
    if (this.config.initialDay) {
      this.currentDay = this.config.initialDay;
      this.engine.setSelectedDay(this.config.initialDay);
    }

    // Set initial view
    if (this.config.initialView) {
      console.log('[Controller] Setting currentView to:', this.config.initialView);
      this.currentView = this.config.initialView;
    }

    console.log('[Controller] After initialization, currentView is:', this.currentView);

    // Create calendar
    this.createCalendar();

    // Subscribe to engine events
    this.unsubscribe = this.engine.subscribe(this.handleEngineEvent);

    // Initial render
    this.render();
  }

  private createCalendar(): void {
    const engineConfig = this.engine.getConfig();
    const timeSlotConfig = buildTimeSlotConfig({
      dayStartTime: engineConfig.dayStartTime,
      dayEndTime: engineConfig.dayEndTime,
      slotMinutes: engineConfig.slotMinutes
    });

    const durationDays = this.currentView === 'resourceTimelineWeek' ? 7 : 1;
    console.log('[Controller] Creating calendar:', {
      currentView: this.currentView,
      durationDays,
      date: this.currentDay,
    });

    this.calendar = createCalendar(this.config.container, [ResourceTimeline], {
      view: this.currentView,
      date: this.currentDay || tools.dateTime.extractDate(new Date().toISOString()),

      // Duration for week view (number of days to show)
      duration: { days: durationDays },

      // Time configuration
      ...timeSlotConfig,

      // Use 24-hour format for time labels (no AM/PM)
      slotLabelFormat: {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      },

      // Resource configuration
      resources: [],
      resourceAreaWidth: '200px',

      // Event configuration
      events: [],
      eventDidMount: this.handleEventDidMount,
      eventClick: this.handleEventClick,

      // Interaction configuration
      selectable: true,
      selectOverlap: true, // Allow selection over background events (segments)
      selectMirror: true, // Show selection rectangle while dragging
      unselectAuto: false, // Don't auto-unselect when clicking away
      select: this.handleSelect,
      dateClick: this.handleDateClick,

      // Enable drag and drop for blocks
      editable: true,
      eventStartEditable: true,
      eventDurationEditable: true,
      eventResourceEditable: true, // Allow moving between courts
      eventOverlap: true, // Allow events to overlap
      eventDragMinDistance: 5, // Minimum pixels to drag before it's considered a drag
      eventDrop: this.handleEventDrop,
      eventResize: this.handleEventResize,
      pointer: true, // Enable pointer interaction

      // Styling
      headerToolbar: {
        start: '',
        center: 'title',
        end: ''
      },

      // Accessibility
      buttonText: {
        today: 'Today',
        resourceTimelineDay: 'Day',
        resourceTimelineWeek: 'Week'
      }
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Set the selected day (public API - updates engine)
   */
  setDay(day: DayId): void {
    // Prevent infinite loop - only update if day actually changed
    if (this.currentDay === day) {
      return;
    }

    this.currentDay = day;
    this.engine.setSelectedDay(day);

    if (this.calendar) {
      this.calendar.setOption('date', day);
    }

    this.render();
  }

  /**
   * Update day display without triggering engine (internal use)
   */
  private updateDayDisplay(day: DayId): void {
    if (this.currentDay === day) {
      return;
    }

    this.currentDay = day;

    if (this.calendar) {
      this.calendar.setOption('date', day);
    }

    this.render();
  }

  /**
   * Get current selected day
   */
  getDay(): DayId | null {
    return this.currentDay;
  }

  /**
   * Set view mode
   */
  setView(view: 'resourceTimelineDay' | 'resourceTimelineWeek'): void {
    this.currentView = view;

    if (this.calendar) {
      this.calendar.setOption('view', view);
    }
  }

  /**
   * Set paint mode and block type (or DELETE action)
   */
  setPaintMode(enabled: boolean, blockType?: BlockType | 'DELETE'): void {
    this.isPaintMode = enabled;

    if (blockType) {
      this.currentPaintType = blockType;
    }

    // Clean up overlay when disabling paint mode
    if (!enabled && this.paintSelectionOverlay) {
      this.paintSelectionOverlay.remove();
      this.paintSelectionOverlay = null;
    }

    // Update cursor style
    if (this.config.container) {
      this.config.container.style.cursor = enabled ? 'crosshair' : 'default';
    }

    // Toggle EventCalendar's selection based on paint mode
    // When paint mode is ON: disable EC selection, use custom handlers
    // When paint mode is OFF: enable EC selection
    if (this.calendar) {
      this.calendar.setOption('selectable', !enabled);
    }

    // Attach/detach paint mode handlers
    if (enabled) {
      this.config.container.addEventListener('mousedown', this.handlePaintMouseDown);
      this.config.container.addEventListener('mousemove', this.handlePaintMouseMove);
      this.config.container.addEventListener('mouseup', this.handlePaintMouseUp);
    } else {
      this.config.container.removeEventListener('mousedown', this.handlePaintMouseDown);
      this.config.container.removeEventListener('mousemove', this.handlePaintMouseMove);
      this.config.container.removeEventListener('mouseup', this.handlePaintMouseUp);
    }
  }

  /**
   * Select courts for multi-court operations
   */
  setSelectedCourts(courts: CourtRef[]): void {
    this.selectedCourts = new Set(courts);
  }

  /**
   * Get selected courts
   */
  getSelectedCourts(): CourtRef[] {
    return Array.from(this.selectedCourts);
  }

  /**
   * Set which courts are visible in the timeline
   * @param courts Set of "tournamentId|facilityId|courtId" resource ID strings, or null for all visible
   */
  setVisibleCourts(courts: Set<string> | null): void {
    // If empty set is passed, treat it as null (show all)
    if (courts && courts.size === 0) {
      this.visibleCourts = null;
    } else {
      this.visibleCourts = courts;
    }
    this.render();
  }

  /**
   * Set layer visibility
   */
  setLayerVisibility(layerId: BlockType, visible: boolean): void {
    this.engine.setLayerVisibility(layerId, visible);
    this.render();
  }

  /**
   * Refresh the calendar display
   */
  refresh(): void {
    this.render();
  }

  /**
   * Destroy the controller and cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    if (this.calendar) {
      destroyCalendar(this.calendar);
      this.calendar = null;
    }
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  private render(): void {
    if (!this.calendar || !this.currentDay) return;

    // Get data from engine
    const timelines = this.engine.getDayTimeline(this.currentDay);
    const courtMeta = this.engine.listCourtMeta();
    const engineConfig = this.engine.getConfig();

    // Get layer visibility from engine state
    const layerVisibility = this.engine['ctx']?.layerVisibility || new Map<BlockType, boolean>();

    // Build projection config
    const projectionConfig: ProjectionConfig = {
      groupingMode: this.config.groupingMode,
      layerVisibility,
      showSegmentLabels: this.config.showSegmentLabels,
      colorScheme: this.config.colorScheme
    };

    // Build resources (courts)
    let resources = buildResourcesFromTimelines(timelines, courtMeta, projectionConfig);

    // Filter resources by visibility (only if visibleCourts is set AND not empty)
    if (this.visibleCourts !== null && this.visibleCourts.size > 0) {
      resources = resources.filter((r) => this.visibleCourts!.has(r.id));
    }

    // Cache resources for paint mode
    this.currentResources = resources;

    // Build events (segments + blocks)
    const segmentEvents = buildEventsFromTimelines(timelines, projectionConfig);

    // Filter events to only show for visible resources
    let filteredSegmentEvents = segmentEvents;
    if (this.visibleCourts !== null && this.visibleCourts.size > 0 && resources.length > 0) {
      const visibleResourceIds = new Set(resources.map((r) => r.id));
      filteredSegmentEvents = segmentEvents.filter((e) => visibleResourceIds.has(e.resourceId));
    }

    // Get actual blocks from engine and build block events
    const blocks = this.engine.getDayBlocks(this.currentDay);
    const blockEvents = buildBlockEvents(blocks, projectionConfig);

    // Filter block events to visible resources
    let filteredBlockEvents = blockEvents;
    if (this.visibleCourts !== null && this.visibleCourts.size > 0 && resources.length > 0) {
      const visibleResourceIds = new Set(resources.map((r) => r.id));
      filteredBlockEvents = blockEvents.filter((e) => visibleResourceIds.has(e.resourceId));
    }

    // Combine events (use filtered versions!)
    let allEvents = [...filteredSegmentEvents, ...filteredBlockEvents];

    // Add conflict indicators if enabled
    if (this.config.showConflicts) {
      // TODO: Get conflicts from engine
      const conflictEvents: CalendarEvent[] = [];
      allEvents = [...allEvents, ...conflictEvents];
    }

    // Update calendar
    this.calendar.setOption('resources', resources);
    this.calendar.setOption('events', allEvents);
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle engine state changes
   */
  private handleEngineEvent = (event: any): void => {
    switch (event.type) {
      case 'STATE_CHANGED':
      case 'BLOCKS_CHANGED':
        this.render();
        break;

      case 'VIEW_CHANGED':
        if (event.payload.day) {
          // Update calendar without triggering engine (avoid circular update)
          this.updateDayDisplay(event.payload.day);
        }
        break;

      case 'CONFLICTS_CHANGED':
        if (this.config.showConflicts) {
          this.render();
        }
        break;
    }
  };

  /**
   * Handle event mount (for custom styling)
   */
  private handleEventDidMount = (info: any): void => {
    const { event, el } = info;

    // Add tooltips for events
    if (event.extendedProps?.isSegment) {
      el.title = `${event.extendedProps.status} segment`;
    } else if (event.extendedProps?.isBlock) {
      el.title = event.extendedProps.reason || event.extendedProps.status;
    } else if (event.extendedProps?.isConflict) {
      el.title = event.extendedProps.message;
    }
  };

  /**
   * Handle event click
   */
  private handleEventClick = (info: any): void => {
    const { event } = info;

    // Handle both block events and segment events
    if (event.extendedProps?.isBlock) {
      const blockId = parseBlockEventId(event.id);
      if (!blockId) return;

      // If in paint mode with DELETE selected, delete the block immediately
      if (this.isPaintMode && this.currentPaintType === 'DELETE') {
        this.deleteBlock(blockId);
        return;
      }

      // If NOT in paint mode, show dialog with Edit/Delete options
      if (!this.isPaintMode) {
        this.showBlockActionDialog(blockId, event);
        return;
      }

      // Otherwise (in paint mode but not DELETE), open time picker for block fine-tuning
      this.openTimePickerForBlock(blockId, event);

      // Also call callback if provided
      if (this.config.onBlockSelected) {
        this.config.onBlockSelected(blockId);
      }
    } else if (event.extendedProps?.isSegment) {
      // Segments can also be clicked to view/create blocks
      this.openTimePickerForSegment(event);
    }
  };

  /**
   * Open time picker to fine-tune a block's times
   */
  private openTimePickerForBlock(blockId: string, event: any): void {
    const engineConfig = this.engine.getConfig();

    // Get the block from engine to get original ISO string times (not Date objects)
    const blocks = this.engine.getDayBlocks(this.currentDay);
    const block = blocks.find((b) => b.id === blockId);

    if (!block) {
      return;
    }

    // Use the block's original ISO string times to avoid any Date conversion issues
    const startISO = block.start;
    const endISO = block.end;

    showModernTimePicker({
      startTime: startISO,
      endTime: endISO,
      dayStartTime: engineConfig.dayStartTime,
      dayEndTime: engineConfig.dayEndTime,
      minuteIncrement: 5,
      onConfirm: (startTime: string, endTime: string) => {
        // Convert HH:mm to full ISO strings for the current day (without Z suffix)
        const currentDay = this.currentDay || tools.dateTime.extractDate(new Date().toISOString());
        const startISO = `${currentDay}T${startTime}:00`;
        const endISO = `${currentDay}T${endTime}:00`;

        // Update the block through engine
        const result = this.engine.resizeBlock({
          blockId,
          newTimeRange: {
            start: startISO,
            end: endISO
          }
        });

        if (result.conflicts.some((c) => c.severity === 'ERROR')) {
          this.showConflictDialog(result.conflicts);
        }
      },
      onCancel: () => {
        // User cancelled - do nothing
      }
    });
  }

  /**
   * Open time picker for segment (to potentially create a block)
   */
  private openTimePickerForSegment(event: any): void {
    const engineConfig = this.engine.getConfig();

    // Extract times as ISO strings preserving the date part
    const startISO = event.start instanceof Date ? event.start.toISOString() : String(event.start);
    const endISO = event.end instanceof Date ? event.end.toISOString() : String(event.end);

    showModernTimePicker({
      startTime: startISO,
      endTime: endISO,
      dayStartTime: engineConfig.dayStartTime,
      dayEndTime: engineConfig.dayEndTime,
      minuteIncrement: 5,
      onConfirm: (startTime: string, endTime: string) => {
        // Could create a new block here or just inform the user
        console.log('Segment time picker confirmed:', { startTime, endTime });
        // TODO: Implement block creation from segment
      },
      onCancel: () => {
        // User cancelled - do nothing
      }
    });
  }

  /**
   * Delete a block
   */
  private deleteBlock(blockId: string): void {
    const result = this.engine.removeBlock(blockId);

    if (result.conflicts.some((c) => c.severity === 'ERROR')) {
      this.showConflictDialog(result.conflicts);
    } else {
      // [TemporalGrid] Block deleted successfully
    }
  }

  /**
   * Show block action dialog (Edit/Delete/Cancel)
   * This is shown when clicking a block while NOT in paint mode
   */
  private showBlockActionDialog(blockId: string, event: any): void {
    const blocks = this.engine.getDayBlocks(this.currentDay);
    const block = blocks.find((b) => b.id === blockId);

    if (!block) {
      return;
    }

    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'block-action-dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'block-action-dialog';
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      min-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Extract time parts for display
    const startTime = tools.dateTime.extractTime(block.start);
    const endTime = tools.dateTime.extractTime(block.end);

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 18px;">${block.type}</h3>
      <div style="margin-bottom: 16px; color: #666;">
        <div>${startTime} - ${endTime}</div>
        <div style="font-size: 14px; margin-top: 4px;">Court: ${block.court.courtId}</div>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn-edit" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Edit Time</button>
        <button class="btn-delete" style="padding: 8px 16px; border: 1px solid #d32f2f; background: #d32f2f; color: white; border-radius: 4px; cursor: pointer;">Delete</button>
        <button class="btn-cancel" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Handle Edit button
    const editBtn = dialog.querySelector('.btn-edit');
    editBtn?.addEventListener('click', () => {
      overlay.remove();
      this.openTimePickerForBlock(blockId, event);
    });

    // Handle Delete button
    const deleteBtn = dialog.querySelector('.btn-delete');
    deleteBtn?.addEventListener('click', () => {
      overlay.remove();
      this.deleteBlock(blockId);
    });

    // Handle Cancel button and overlay click
    const cancelBtn = dialog.querySelector('.btn-cancel');
    cancelBtn?.addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Handle keyboard shortcut (Delete/Backspace)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        overlay.remove();
        this.deleteBlock(blockId);
        document.removeEventListener('keydown', handleKeyDown);
      } else if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Open time picker to create a new block with user-defined times
   *
   * Smart end time logic:
   * 1. Get the rail timeline for this court (shows segments/availability)
   * 2. Find the next segment boundary after clicked time
   * 3. Use that boundary as end time, OR start + 3 hours, whichever is sooner
   * 4. Never exceed day end time
   */
  private openTimePickerForNewBlock(court: CourtRef, clickedTime?: Date): void {
    const engineConfig = this.engine.getConfig();
    const currentDay = this.currentDay || tools.dateTime.extractDate(new Date().toISOString());

    // Use the clicked time if provided, otherwise use current time
    let startDate: Date;
    if (clickedTime) {
      startDate = clickedTime;
    } else {
      startDate = new Date();
    }

    // Get the timeline for this court to see segments (availability boundaries)
    const timelines = this.engine.getDayTimeline(this.currentDay);
    const courtTimeline = timelines
      .flatMap((f) => f.rails)
      .find(
        (r) =>
          r.court.tournamentId === court.tournamentId &&
          r.court.facilityId === court.facilityId &&
          r.court.courtId === court.courtId
      );

    // Find the next segment boundary after the clicked time
    const startTime = startDate.getTime();
    let nextBoundary: Date | null = null;

    if (courtTimeline) {
      // Look at all segments and find the next one that starts after our click time
      for (const segment of courtTimeline.segments) {
        // CRITICAL: Segment times are stored without 'Z', so parse as UTC by adding 'Z'
        const segmentStartStr = segment.start.endsWith('Z') ? segment.start : segment.start + 'Z';
        const segmentEndStr = segment.end.endsWith('Z') ? segment.end : segment.end + 'Z';
        const segmentStart = new Date(segmentStartStr).getTime();
        const segmentEnd = new Date(segmentEndStr).getTime();

        // If the clicked time is within this segment, use the segment end
        if (startTime >= segmentStart && startTime < segmentEnd) {
          nextBoundary = new Date(segmentEnd);
          break;
        }

        // If there's a segment that starts after our time, that's a boundary
        if (segmentStart > startTime) {
          nextBoundary = new Date(segmentStart);
          break;
        }
      }
    }

    // Also check for existing blocks on this court
    // We need to find ANY block that would overlap with our potential range
    // This includes blocks that start after our clicked time
    // IMPORTANT: Block times are stored without 'Z', so we need to parse them as UTC
    const existingBlocks = this.engine.getDayBlocks(this.currentDay);

    const blocksOnThisCourt = existingBlocks.filter(
      (b) =>
        b.court.tournamentId === court.tournamentId &&
        b.court.facilityId === court.facilityId &&
        b.court.courtId === court.courtId
    );

    const relevantBlocks = blocksOnThisCourt.filter((b) => {
      // Parse as UTC by ensuring 'Z' suffix
      const blockStartStr = b.start.endsWith('Z') ? b.start : b.start + 'Z';
      const blockEndStr = b.end.endsWith('Z') ? b.end : b.end + 'Z';
      const blockStart = new Date(blockStartStr).getTime();
      const blockEnd = new Date(blockEndStr).getTime();

      const isRelevant = blockStart > startTime || blockEnd > startTime;

      // Include blocks that start after our clicked time
      // (these would be potential overlaps if we extend past their start)
      return isRelevant;
    });

    // Find the earliest block start time that's after our clicked time
    let nextBlockStart: number | undefined;
    try {
      nextBlockStart = relevantBlocks
        .map((b) => {
          const blockStartStr = b.start.endsWith('Z') ? b.start : b.start + 'Z';
          return new Date(blockStartStr).getTime();
        })
        .filter((blockStart) => blockStart > startTime)
        .sort((a, b) => a - b)[0];
    } catch (error) {
      console.error('[TemporalGrid] Error calculating nextBlockStart:', error);
      nextBlockStart = undefined;
    }

    // Calculate end time:
    // Use the nearest boundary: next segment, next block start, or start + 3 hours
    const maxDurationHours = 3; // TODO: should come from config
    const maxEndTime = startTime + maxDurationHours * 60 * 60 * 1000;

    let endDate: Date;
    const boundaries = [
      nextBoundary ? nextBoundary.getTime() : Infinity,
      nextBlockStart || Infinity,
      maxEndTime
    ].filter((t) => t !== Infinity);

    endDate = new Date(Math.min(...boundaries));

    // Snap to 5-minute increments
    startDate = this.snapToMinutes(startDate, 5);
    endDate = this.snapToMinutes(endDate, 5);

    // Ensure end time doesn't exceed day end
    const dayEndParts = engineConfig.dayEndTime.split(':');
    const dayEndTime = new Date(`${currentDay}T${dayEndParts[0]}:${dayEndParts[1]}:00Z`).getTime();
    if (endDate.getTime() > dayEndTime) {
      endDate = new Date(dayEndTime);
    }

    // Calculate maxDuration in minutes to prevent overlaps
    const maxDurationMinutes = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    // Check if maxDurationMinutes is valid (must be positive)
    if (maxDurationMinutes <= 0) {
      // Cannot create block: No available time (too close to existing block or day boundary
      return;
    }

    showModernTimePicker({
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      dayStartTime: engineConfig.dayStartTime,
      dayEndTime: engineConfig.dayEndTime,
      minuteIncrement: 5,
      maxDuration: maxDurationMinutes, // Restrict based on next block
      onConfirm: (startTime: string, endTime: string) => {
        // Convert HH:mm to full ISO strings for the current day (without Z suffix)
        let startISO = `${currentDay}T${startTime}:00`;
        let endISO = `${currentDay}T${endTime}:00`;

        // Apply collision-aware clamping to the confirmed times
        // This prevents overlaps even if user overrides maxDuration
        const startTimestamp = new Date(startISO + 'Z').getTime();
        const endTimestamp = new Date(endISO + 'Z').getTime();

        // Get existing blocks on this court for collision detection
        const existingBlocks = this.engine.getDayBlocks(currentDay);
        const blocksOnCourt = existingBlocks.filter(
          (b) =>
            b.court.tournamentId === court.tournamentId &&
            b.court.facilityId === court.facilityId &&
            b.court.courtId === court.courtId
        );

        // Sort blocks by start time for efficient collision detection
        sortBlocksByStart(blocksOnCourt);

        // Apply collision clamping
        const clamped = clampDragToCollisions(startTimestamp, endTimestamp, blocksOnCourt);

        // Use clamped times
        const clampedStartDate = new Date(clamped.start);
        const clampedEndDate = new Date(clamped.end);

        // Convert back to ISO strings without Z
        startISO = clampedStartDate.toISOString().slice(0, 19);
        endISO = clampedEndDate.toISOString().slice(0, 19);

        // Check if clamping resulted in zero or negative duration
        if (clampedEndDate.getTime() <= clampedStartDate.getTime()) {
          // Cannot create block: The selected time would overlap with an existing block.
          return;
        }

        // Create the block
        // DELETE is a paint action, not a block type - ignore it here
        if (this.currentPaintType === 'DELETE') {
          return;
        }

        this.engine.applyBlock({
          type: this.currentPaintType,
          courts: [court],
          timeRange: {
            start: startISO,
            end: endISO
          }
        });
      },
      onCancel: () => {
        // User cancelled - do nothing
        // [TemporalGrid] Time picker cancelled'
      }
    });
  }

  /**
   * Handle time range selection (for painting)
   */
  private handleSelect = (info: any): void => {
    const { start, end, resource } = info;

    // Parse resource ID to court reference
    const court = parseResourceId(resource.id);
    if (!court) return;

    // In paint mode, apply to all selected courts
    const courts = this.isPaintMode && this.selectedCourts.size > 0 ? Array.from(this.selectedCourts) : [court];

    // Apply block
    if (this.isPaintMode) {
      // DELETE is a paint action, not a block type - ignore it here
      if (this.currentPaintType === 'DELETE') {
        // [TemporalGrid] Cannot create DELETE blocks via drag
        return;
      }

      const result = this.engine.applyBlock({
        courts,
        timeRange: { start, end },
        type: this.currentPaintType,
        reason: `${this.currentPaintType} block`
      });

      if (result.conflicts.some((c) => c.severity === 'ERROR')) {
        this.showConflictDialog(result.conflicts);
      }
    } else {
      if (this.config.onTimeRangeSelected) {
        this.config.onTimeRangeSelected({ courts, start, end });
      }
    }

    // Clear selection
    this.calendar?.unselect();
  };

  /**
   * Handle event drag (move block)
   */
  private handleEventDrop = (info: any): void => {
    const { event, revert } = info;

    // Only handle block events
    if (!event.extendedProps?.isBlock) {
      revert();
      return;
    }

    const blockId = parseBlockEventId(event.id);
    if (!blockId) {
      revert();
      return;
    }

    // Check if court changed
    const newCourt = parseResourceId(event.resourceId);

    // Move block in engine
    const result = this.engine.moveBlock({
      blockId,
      newTimeRange: {
        start: event.start,
        end: event.end
      },
      newCourt: newCourt || undefined
    });

    // Check for conflicts
    if (result.conflicts.some((c) => c.severity === 'ERROR')) {
      revert();
      this.showConflictDialog(result.conflicts);
    }
  };

  /**
   * Handle event resize
   */
  private handleEventResize = (info: any): void => {
    const { event, revert } = info;

    // Only handle block events
    if (!event.extendedProps?.isBlock) {
      revert();
      return;
    }

    const blockId = parseBlockEventId(event.id);
    if (!blockId) {
      revert();
      return;
    }

    // Resize block in engine
    const result = this.engine.resizeBlock({
      blockId,
      newTimeRange: {
        start: event.start,
        end: event.end
      }
    });

    // Check for conflicts
    if (result.conflicts.some((c) => c.severity === 'ERROR')) {
      revert();
      this.showConflictDialog(result.conflicts);
    }
  };

  // ============================================================================
  // UI Helpers
  // ============================================================================

  /**
   * Snap a date to the nearest N-minute increment
   */
  private snapToMinutes(date: Date, minutes: number): Date {
    const ms = date.getTime();
    const minutesInMs = minutes * 60 * 1000;
    const rounded = Math.round(ms / minutesInMs) * minutesInMs;
    return new Date(rounded);
  }

  /**
   * Show conflict dialog
   * TODO: Implement proper modal/dialog component
   */
  private showConflictDialog(conflicts: any[]): void {
    const messages = conflicts
      .filter((c) => c.severity === 'ERROR')
      .map((c) => c.message)
      .join('\n');

    alert(`Cannot complete operation:\n\n${messages}`);
  }

  /**
   * Handle date/time click on calendar (EventCalendar API)
   */
  private handleDateClick = (info: any): void => {
    if (!this.isPaintMode) return;

    // Use EventCalendar's info which includes resource!
    if (info.resource) {
      this.paintDragStart = {
        x: info.jsEvent.clientX,
        y: info.jsEvent.clientY,
        resourceId: info.resource.id
      };
    }
  };

  /**
   * Manual paint mode: Handle mouse down
   * Implements Rule B: Prevent drag start inside existing block
   */
  private handlePaintMouseDown = (e: MouseEvent): void => {
    if (!this.isPaintMode) return;

    // Find which resource (court) was clicked
    const resourceId = this.getResourceIdFromMouseEvent(e);

    if (!resourceId) return;

    // Rule B: Check if starting inside an existing block
    const court = parseResourceId(resourceId);
    if (court) {
      const timeRange = this.calculateTimeRangeFromMouseEvent(e.clientX, e.clientX);
      if (timeRange) {
        const clickTime = timeRange.start.getTime();

        // Get all blocks on this court
        const existingBlocks = this.engine.getDayBlocks(this.currentDay);
        const blocksOnCourt = existingBlocks.filter(
          (b) =>
            b.court.tournamentId === court.tournamentId &&
            b.court.facilityId === court.facilityId &&
            b.court.courtId === court.courtId
        );

        // Check if click is inside any existing block
        const blocksContaining = findBlocksContainingTime(clickTime, blocksOnCourt);

        if (blocksContaining.length > 0) {
          // [TemporalGrid] Cannot start drag inside existing block:', blocksContaining[0]
          // TODO: Show tooltip "Can't start inside an existing block"
          return; // Abort drag start
        }
      }
    }

    this.paintDragStart = {
      x: e.clientX,
      y: e.clientY,
      resourceId
    };
  };

  /**
   * Manual paint mode: Handle mouse move - show visual feedback
   */
  private handlePaintMouseMove = (e: MouseEvent): void => {
    if (!this.isPaintMode || !this.paintDragStart || e.buttons !== 1) {
      // Clean up overlay if not dragging
      if (this.paintSelectionOverlay) {
        this.paintSelectionOverlay.remove();
        this.paintSelectionOverlay = null;
      }
      return;
    }

    // Get current resource
    const currentResourceId = this.getResourceIdFromMouseEvent(e);

    // Only show overlay if on same resource
    if (currentResourceId !== this.paintDragStart.resourceId) {
      if (this.paintSelectionOverlay) {
        this.paintSelectionOverlay.remove();
        this.paintSelectionOverlay = null;
      }
      return;
    }

    // Create overlay if it doesn't exist
    if (!this.paintSelectionOverlay) {
      this.paintSelectionOverlay = document.createElement('div');
      this.paintSelectionOverlay.style.position = 'fixed'; // Fixed to viewport, not absolute
      this.paintSelectionOverlay.style.backgroundColor = 'rgba(33, 141, 141, 0.3)'; // Teal semi-transparent
      this.paintSelectionOverlay.style.border = '2px solid #218D8D';
      this.paintSelectionOverlay.style.pointerEvents = 'none';
      this.paintSelectionOverlay.style.zIndex = '10000'; // Very high z-index
      this.paintSelectionOverlay.style.display = 'flex';
      this.paintSelectionOverlay.style.alignItems = 'center';
      this.paintSelectionOverlay.style.justifyContent = 'center';
      this.paintSelectionOverlay.style.fontSize = '12px';
      this.paintSelectionOverlay.style.fontWeight = 'bold';
      this.paintSelectionOverlay.style.color = '#218D8D';
      this.paintSelectionOverlay.style.textShadow = '0 0 3px white';
      document.body.appendChild(this.paintSelectionOverlay); // Append to body for fixed positioning
    }

    // Calculate overlay position using same logic as resource detection
    const timeline = this.config.container.querySelector('.ec-timeline');
    if (!timeline) return;

    const bodyEl = timeline.querySelector('.ec-body');
    if (!bodyEl) return;

    const bodyRect = bodyEl.getBoundingClientRect();

    // Find resource index using same method as detection
    const resourceIndex = this.currentResources.findIndex((r) => r.id === currentResourceId);
    if (resourceIndex === -1) return;

    // Calculate row position (same as detection logic)
    const totalHeight = bodyRect.height;
    const rowHeight = totalHeight / this.currentResources.length;
    const rowTop = bodyRect.top + resourceIndex * rowHeight;

    // Calculate horizontal position (time range)
    const startX = Math.min(this.paintDragStart.x, e.clientX);
    const endX = Math.max(this.paintDragStart.x, e.clientX);
    const width = Math.max(1, endX - startX); // Minimum 1px width

    // Calculate time range for display
    const timeRange = this.calculateTimeRangeFromMouseEvent(this.paintDragStart.x, e.clientX);
    let timeText = '';
    if (timeRange) {
      // Snap times to 5-minute increments for display
      const snappedStart = this.snapToMinutes(timeRange.start, 5);
      const snappedEnd = this.snapToMinutes(timeRange.end, 5);

      // Display in UTC to match what will be created (not local time)
      const startTime = snappedStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      const endTime = snappedEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      timeText = `${startTime} - ${endTime}`;
    }

    // Update overlay with absolute positioning
    this.paintSelectionOverlay.style.left = `${startX}px`;
    this.paintSelectionOverlay.style.top = `${rowTop}px`;
    this.paintSelectionOverlay.style.width = `${width}px`;
    this.paintSelectionOverlay.style.height = `${rowHeight}px`;
    this.paintSelectionOverlay.textContent = timeText;
  };

  /**
   * Manual paint mode: Handle mouse up - create the block
   */
  private handlePaintMouseUp = (e: MouseEvent): void => {
    if (!this.isPaintMode || !this.paintDragStart) return;

    const endResourceId = this.getResourceIdFromMouseEvent(e);

    if (!endResourceId) {
      this.paintDragStart = null;
      return;
    }

    // For now, only support painting within same resource
    if (endResourceId !== this.paintDragStart.resourceId) {
      this.paintDragStart = null;
      return;
    }

    // Check if this was a click (minimal movement) vs a drag
    const deltaX = Math.abs(e.clientX - this.paintDragStart.x);
    const deltaY = Math.abs(e.clientY - this.paintDragStart.y);
    const isClick = deltaX < 5 && deltaY < 5; // Less than 5px movement = click

    // If it's a click, open the time picker instead of creating a 0-minute block
    if (isClick) {
      const court = parseResourceId(endResourceId);
      if (court) {
        // Calculate the time where the user clicked
        const clickTime = this.calculateTimeRangeFromMouseEvent(this.paintDragStart.x, this.paintDragStart.x);
        this.openTimePickerForNewBlock(court, clickTime?.start);
      }
      this.paintDragStart = null;
      // Clean up overlay
      if (this.paintSelectionOverlay) {
        this.paintSelectionOverlay.remove();
        this.paintSelectionOverlay = null;
      }
      return;
    }

    // Calculate time range from pixel positions
    const timeRange = this.calculateTimeRangeFromMouseEvent(this.paintDragStart.x, e.clientX);

    if (!timeRange) {
      this.paintDragStart = null;
      return;
    }

    // Parse resource ID to get court
    const court = parseResourceId(endResourceId);
    if (!court) {
      this.paintDragStart = null;
      return;
    }

    // Get existing blocks on this court for collision detection
    const existingBlocks = this.engine.getDayBlocks(this.currentDay);
    const blocksOnCourt = existingBlocks.filter(
      (b) =>
        b.court.tournamentId === court.tournamentId &&
        b.court.facilityId === court.facilityId &&
        b.court.courtId === court.courtId
    );

    // Sort blocks by start time for efficient collision detection
    sortBlocksByStart(blocksOnCourt);

    // Get anchor and cursor times
    const anchorTimeRange = this.calculateTimeRangeFromMouseEvent(this.paintDragStart.x, this.paintDragStart.x);
    if (!anchorTimeRange) {
      this.paintDragStart = null;
      return;
    }

    const anchorTime = anchorTimeRange.start.getTime();
    const cursorTime = timeRange.end.getTime(); // Use end because timeRange is normalized

    // Apply collision-aware clamping (Rules A & C)
    const clamped = clampDragToCollisions(anchorTime, cursorTime, blocksOnCourt);

    // Use clamped times
    const clampedStartDate = new Date(clamped.start);
    const clampedEndDate = new Date(clamped.end);

    // Snap times to 5-minute increments
    const snappedStart = this.snapToMinutes(clampedStartDate, 5);
    const snappedEnd = this.snapToMinutes(clampedEndDate, 5);

    // If clamping resulted in zero or negative duration, don't create block
    if (snappedEnd.getTime() <= snappedStart.getTime()) {
      this.paintDragStart = null;
      if (this.paintSelectionOverlay) {
        this.paintSelectionOverlay.remove();
        this.paintSelectionOverlay = null;
      }
      return;
    }

    // DELETE is a paint action, not a block type - ignore it here
    if (this.currentPaintType === 'DELETE') {
      // [TemporalGrid] Cannot create DELETE blocks via paint drag
      return;
    }

    this.engine.applyBlock({
      type: this.currentPaintType,
      courts: [court],
      timeRange: {
        start: snappedStart.toISOString(),
        end: snappedEnd.toISOString()
      }
    });

    // Clean up visual overlay
    if (this.paintSelectionOverlay) {
      this.paintSelectionOverlay.remove();
      this.paintSelectionOverlay = null;
    }

    // Refresh display
    this.render();

    // Reset drag state
    this.paintDragStart = null;
  };

  /**
   * Get resource ID from mouse event by inspecting DOM (fallback method)
   */
  private getResourceIdFromMouseEvent(e: MouseEvent): string | null {
    const y = e.clientY;

    if (this.currentResources.length === 0) return null;

    // Get the timeline body which contains all rows
    const timeline = this.config.container.querySelector('.ec-timeline');
    if (!timeline) return null;

    const bodyEl = timeline.querySelector('.ec-body');
    if (!bodyEl) return null;

    const bodyRect = bodyEl.getBoundingClientRect();

    // Calculate which resource index based on Y position
    // Divide body height by number of resources to get row height
    const totalHeight = bodyRect.height;
    const rowHeight = totalHeight / this.currentResources.length;
    const relativeY = y - bodyRect.top;
    const resourceIndex = Math.floor(relativeY / rowHeight);

    // Clamp to valid range
    const clampedIndex = Math.max(0, Math.min(resourceIndex, this.currentResources.length - 1));

    return this.currentResources[clampedIndex]?.id || null;
  }

  /**
   * Calculate time range from mouse X positions
   * Uses EventCalendar's dateFromPoint API for accurate positioning
   */
  private calculateTimeRangeFromMouseEvent(startX: number, endX: number): { start: Date; end: Date } | null {
    if (!this.calendar || !this.currentDay) return null;

    // Use EventCalendar's dateFromPoint method if available
    // This handles all the complexity: scroll, multi-day, time calculations
    const calendar = this.calendar as any;
    
    if (calendar.dateFromPoint) {
      const startDate = calendar.dateFromPoint(startX, 0); // Y doesn't matter for timeline
      const endDate = calendar.dateFromPoint(endX, 0);
      
      if (startDate && endDate) {
        return {
          start: startDate < endDate ? startDate : endDate,
          end: startDate < endDate ? endDate : startDate,
        };
      }
    }

    // Fallback: Manual calculation (original implementation)
    // This may have scroll offset issues but provides a backup
    const timelineEl = this.config.container.querySelector('.ec-timeline');
    if (!timelineEl) return null;

    const bodyEl = timelineEl.querySelector('.ec-body');
    if (!bodyEl) return null;

    let contentEl =
      bodyEl.querySelector('.ec-days') || bodyEl.querySelector('.ec-content') || bodyEl.querySelector('.ec-time');

    if (!contentEl) {
      contentEl = bodyEl as HTMLElement;
    }

    const rect = (contentEl as HTMLElement).getBoundingClientRect();
    const sidebarEl = bodyEl.querySelector('.ec-sidebar');
    let timeGridLeft = rect.left;

    if (sidebarEl && contentEl === bodyEl) {
      const sidebarRect = (sidebarEl as HTMLElement).getBoundingClientRect();
      timeGridLeft = sidebarRect.right;
    }

    const timeGridWidth = rect.right - timeGridLeft;
    const config = this.engine.getConfig();
    const isWeekView = this.currentView === 'resourceTimelineWeek';
    const numDays = isWeekView ? 7 : 1;
    const dayWidth = timeGridWidth / numDays;

    const xToTime = (x: number): Date => {
      const relativeX = x - timeGridLeft;
      const dayIndex = Math.floor(relativeX / dayWidth);
      const clampedDayIndex = Math.max(0, Math.min(numDays - 1, dayIndex));
      const dayStartX = clampedDayIndex * dayWidth;
      const positionInDay = Math.max(0, Math.min(1, (relativeX - dayStartX) / dayWidth));
      
      const baseDate = new Date(`${this.currentDay}T00:00:00Z`);
      const targetDate = new Date(baseDate);
      targetDate.setUTCDate(baseDate.getUTCDate() + clampedDayIndex);
      const targetDayId = tools.dateTime.extractDate(targetDate.toISOString());
      
      const dayStart = new Date(`${targetDayId}T${config.dayStartTime}:00Z`);
      const dayEnd = new Date(`${targetDayId}T${config.dayEndTime}:00Z`);
      const dayDuration = dayEnd.getTime() - dayStart.getTime();
      
      return new Date(dayStart.getTime() + dayDuration * positionInDay);
    };

    const start = xToTime(Math.min(startX, endX));
    const end = xToTime(Math.max(startX, endX));

    return { start, end };
  }

  /**
   * Get calendar instance (for advanced usage)
   */
  getCalendar(): Calendar | null {
    return this.calendar;
  }

  /**
   * Get engine instance
   */
  getEngine(): TemporalGridEngine {
    return this.engine;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a temporal grid controller
 */
export function createTemporalGridControl(
  engine: TemporalGridEngine,
  config: TemporalGridControlConfig
): TemporalGridControl {
  return new TemporalGridControl(engine, config);
}
