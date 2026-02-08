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
  type ResourceGroupingMode,
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
  onTimeRangeSelected?: (params: {
    courts: CourtRef[];
    start: string;
    end: string;
  }) => void;
}

// ============================================================================
// Temporal Grid Controller
// ============================================================================

export class TemporalGridControl {
  private engine: TemporalGridEngine;
  private calendar: Calendar | null = null;
  private config: TemporalGridControlConfig;
  private unsubscribe: (() => void) | null = null;

  // View state
  private currentDay: DayId | null = null;
  private currentView: 'resourceTimelineDay' | 'resourceTimelineWeek' = 'resourceTimelineDay';
  private selectedCourts: Set<CourtRef> = new Set();
  private currentPaintType: BlockType = 'AVAILABLE';
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
      ...config,
    };

    this.initialize();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initialize(): void {
    // Set initial day
    if (this.config.initialDay) {
      this.currentDay = this.config.initialDay;
      this.engine.setSelectedDay(this.config.initialDay);
    }

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
      slotMinutes: engineConfig.slotMinutes,
    });

    this.calendar = createCalendar(
      this.config.container,
      [ResourceTimeline],
      {
        view: this.currentView,
        date: this.currentDay || tools.dateTime.extractDate(new Date().toISOString()),
        
        // Time configuration
        ...timeSlotConfig,
        
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
          end: '',
        },
        
        // Accessibility
        buttonText: {
          today: 'Today',
          resourceTimelineDay: 'Day',
          resourceTimelineWeek: 'Week',
        },
      }
    );
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
   * Set paint mode and block type
   */
  setPaintMode(enabled: boolean, blockType?: BlockType): void {
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
    
    // Attach/detach paint mode handlers to avoid interfering with EventCalendar drag
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
      colorScheme: this.config.colorScheme,
    };

    // Build resources (courts)
    let resources = buildResourcesFromTimelines(timelines, courtMeta, projectionConfig);
    
    // Filter resources by visibility (only if visibleCourts is set AND not empty)
    if (this.visibleCourts !== null && this.visibleCourts.size > 0) {
      resources = resources.filter(r => this.visibleCourts!.has(r.id));
    }
    
    // Cache resources for paint mode
    this.currentResources = resources;
    
    // Build events (segments + blocks)
    const segmentEvents = buildEventsFromTimelines(timelines, projectionConfig);
    
    // Filter events to only show for visible resources
    let filteredSegmentEvents = segmentEvents;
    if (this.visibleCourts !== null && this.visibleCourts.size > 0 && resources.length > 0) {
      const visibleResourceIds = new Set(resources.map(r => r.id));
      filteredSegmentEvents = segmentEvents.filter(e => visibleResourceIds.has(e.resourceId));
    }
    
    // Get actual blocks from engine and build block events
    const blocks = this.engine.getDayBlocks(this.currentDay);
    const blockEvents = buildBlockEvents(blocks, projectionConfig);
    
    // Filter block events to visible resources
    let filteredBlockEvents = blockEvents;
    if (this.visibleCourts !== null && this.visibleCourts.size > 0 && resources.length > 0) {
      const visibleResourceIds = new Set(resources.map(r => r.id));
      filteredBlockEvents = blockEvents.filter(e => visibleResourceIds.has(e.resourceId));
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
      
      // Open time picker for block fine-tuning
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
    const block = blocks.find(b => b.id === blockId);
    
    if (!block) {
      console.error('Block not found:', blockId);
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
        // Convert HH:mm to full ISO strings for the current day
        const currentDay = this.currentDay || tools.dateTime.extractDate(new Date().toISOString());
        const startISO = `${currentDay}T${startTime}:00Z`;
        const endISO = `${currentDay}T${endTime}:00Z`;
        
        // Update the block through engine
        const result = this.engine.resizeBlock({
          blockId,
          newTimeRange: {
            start: startISO,
            end: endISO,
          },
        });
        
        if (result.conflicts.some(c => c.severity === 'ERROR')) {
          this.showConflictDialog(result.conflicts);
        }
      },
      onCancel: () => {
        // User cancelled - do nothing
      },
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
      },
    });
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
      .flatMap(f => f.rails)
      .find(r => 
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
        const segmentStart = new Date(segment.start).getTime();
        const segmentEnd = new Date(segment.end).getTime();
        
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
    const existingBlocks = this.engine.getDayBlocks(this.currentDay);
    const nextBlock = existingBlocks
      .filter(b => 
        b.court.tournamentId === court.tournamentId &&
        b.court.facilityId === court.facilityId &&
        b.court.courtId === court.courtId
      )
      .map(b => new Date(b.start).getTime())
      .filter(blockStart => blockStart > startTime)
      .sort((a, b) => a - b)[0];
    
    // Calculate end time:
    // Use the nearest boundary: next segment, next block, or start + 3 hours
    const maxDurationHours = 3; // TODO: should come from config
    const maxEndTime = startTime + (maxDurationHours * 60 * 60 * 1000);
    
    let endDate: Date;
    const boundaries = [
      nextBoundary ? nextBoundary.getTime() : Infinity,
      nextBlock || Infinity,
      maxEndTime,
    ].filter(t => t !== Infinity);
    
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
    
    showModernTimePicker({
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      dayStartTime: engineConfig.dayStartTime,
      dayEndTime: engineConfig.dayEndTime,
      minuteIncrement: 5,
      onConfirm: (startTime: string, endTime: string) => {
        // Convert HH:mm to full ISO strings for the current day
        const startISO = `${currentDay}T${startTime}:00Z`;
        const endISO = `${currentDay}T${endTime}:00Z`;
        
        // Create the block
        this.engine.applyBlock({
          type: this.currentPaintType,
          courts: [court],
          timeRange: {
            start: startISO,
            end: endISO,
          },
        });
      },
      onCancel: () => {
        // User cancelled - do nothing
      },
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
    const courts = this.isPaintMode && this.selectedCourts.size > 0
      ? Array.from(this.selectedCourts)
      : [court];
    
    // Apply block
    if (this.isPaintMode) {
      const result = this.engine.applyBlock({
        courts,
        timeRange: { start, end },
        type: this.currentPaintType,
        reason: `${this.currentPaintType} block`,
      });
      
      if (result.conflicts.some(c => c.severity === 'ERROR')) {
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
        end: event.end,
      },
      newCourt: newCourt || undefined,
    });
    
    // Check for conflicts
    if (result.conflicts.some(c => c.severity === 'ERROR')) {
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
        end: event.end,
      },
    });
    
    // Check for conflicts
    if (result.conflicts.some(c => c.severity === 'ERROR')) {
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
      .filter(c => c.severity === 'ERROR')
      .map(c => c.message)
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
        resourceId: info.resource.id,
      };
    }
  };

  /**
   * Manual paint mode: Handle mouse down
   */
  private handlePaintMouseDown = (e: MouseEvent): void => {
    if (!this.isPaintMode) return;
    
    // EventCalendar's dateClick should handle this, but keep as fallback
    // Find which resource (court) was clicked
    const resourceId = this.getResourceIdFromMouseEvent(e);
    
    if (resourceId) {
      this.paintDragStart = {
        x: e.clientX,
        y: e.clientY,
        resourceId,
      };
    }
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
    const resourceIndex = this.currentResources.findIndex(r => r.id === currentResourceId);
    if (resourceIndex === -1) return;
    
    // Calculate row position (same as detection logic)
    const totalHeight = bodyRect.height;
    const rowHeight = totalHeight / this.currentResources.length;
    const rowTop = bodyRect.top + (resourceIndex * rowHeight);
    
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
    
    // Snap times to 5-minute increments
    const snappedStart = this.snapToMinutes(timeRange.start, 5);
    const snappedEnd = this.snapToMinutes(timeRange.end, 5);
    
    // Parse resource ID to get court
    const court = parseResourceId(endResourceId);
    if (!court) {
      this.paintDragStart = null;
      return;
    }
    
    // Check for overlapping blocks and handle based on type
    const existingBlocks = this.engine.getDayBlocks(this.currentDay);
    const overlappingBlocks = existingBlocks.filter(b => {
      // Check if same court
      if (b.court.tournamentId !== court.tournamentId || 
          b.court.facilityId !== court.facilityId || 
          b.court.courtId !== court.courtId) {
        return false;
      }
      
      // Check if time ranges overlap
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();
      const newStart = snappedStart.getTime();
      const newEnd = snappedEnd.getTime();
      
      return !(newEnd <= bStart || newStart >= bEnd);
    });
    
    // Handle overlaps based on block type logic
    if (overlappingBlocks.length > 0) {
      // If painting AVAILABLE over existing AVAILABLE - warn and skip
      if (this.currentPaintType === 'AVAILABLE' && overlappingBlocks.some(b => b.type === 'AVAILABLE')) {
        alert('This time range already has an AVAILABLE block. Use BLOCKED or SCHEDULED to override, or clear the existing block first.');
        this.paintDragStart = null;
        return;
      }
      
      // TODO: Implement block splitting logic
      // For BLOCKED over AVAILABLE: split the AVAILABLE block
      // For SCHEDULED over AVAILABLE: split the AVAILABLE block
      // For now, we'll allow it but blocks will overlap (rail derivation will show correct merged view)
    }
    
    // Create the block with snapped ISO string dates
    this.engine.applyBlock({
      type: this.currentPaintType,
      courts: [court],
      timeRange: {
        start: snappedStart.toISOString(),
        end: snappedEnd.toISOString(),
      },
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
  };

  /**
   * Calculate time range from mouse X positions
   */
  private calculateTimeRangeFromMouseEvent(startX: number, endX: number): { start: Date; end: Date } | null {
    if (!this.calendar || !this.currentDay) return null;
    
    // Get the timeline and find the actual time grid area (excluding resource labels sidebar)
    const timelineEl = this.config.container.querySelector('.ec-timeline');
    if (!timelineEl) {
      console.error('No timeline element found');
      return null;
    }
    
    // Find the body element first
    const bodyEl = timelineEl.querySelector('.ec-body');
    if (!bodyEl) {
      console.error('No body element found');
      return null;
    }
    
    // Try to find the actual time grid within the body (excludes resource label column)
    // EventCalendar structure: .ec-body contains .ec-sidebar (labels) and .ec-days (time grid)
    let contentEl = bodyEl.querySelector('.ec-days') || 
                    bodyEl.querySelector('.ec-content') ||
                    bodyEl.querySelector('.ec-time');
    
    // If we can't find a specific time grid element, try to measure the sidebar and subtract it
    if (!contentEl) {
      contentEl = bodyEl as HTMLElement;
    }
    
    const rect = (contentEl as HTMLElement).getBoundingClientRect();
    
    // Also check if there's a sidebar we need to account for
    const sidebarEl = bodyEl.querySelector('.ec-sidebar');
    let timeGridLeft = rect.left;
    
    if (sidebarEl && contentEl === bodyEl) {
      // If we're using the body and there's a sidebar, we need to exclude it
      const sidebarRect = (sidebarEl as HTMLElement).getBoundingClientRect();
      timeGridLeft = sidebarRect.right; // Time grid starts after sidebar
    }
    
    const timeGridWidth = rect.right - timeGridLeft;
    
    // Calculate relative positions (0 to 1) within the time grid
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    
    const startRelative = Math.max(0, Math.min(1, (minX - timeGridLeft) / timeGridWidth));
    const endRelative = Math.max(0, Math.min(1, (maxX - timeGridLeft) / timeGridWidth));
    
    // Get day start/end times from engine config
    const config = this.engine.getConfig();
    
    // IMPORTANT: Parse as UTC to avoid timezone conversion issues
    // Add 'Z' suffix to force UTC interpretation
    const dayStart = new Date(`${this.currentDay}T${config.dayStartTime}:00Z`);
    const dayEnd = new Date(`${this.currentDay}T${config.dayEndTime}:00Z`);
    const dayDuration = dayEnd.getTime() - dayStart.getTime();
    
    const start = new Date(dayStart.getTime() + dayDuration * startRelative);
    const end = new Date(dayStart.getTime() + dayDuration * endRelative);
    
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
  config: TemporalGridControlConfig,
): TemporalGridControl {
  return new TemporalGridControl(engine, config);
}
