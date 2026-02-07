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

import { createCalendar, destroyCalendar, ResourceTimeline } from '@event-calendar/core';
import type { TemporalGridEngine } from '../engine/temporalGridEngine';
import type { BlockType, CourtRef, DayId } from '../engine/types';
import {
  buildBlockEvents,
  buildConflictEvents,
  buildEventsFromTimelines,
  buildFacilityGroups,
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
        date: this.currentDay || new Date().toISOString().slice(0, 10),
        
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
        select: this.handleSelect,
        editable: true,
        eventDrop: this.handleEventDrop,
        eventResize: this.handleEventResize,
        
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
    
    // Update cursor style
    if (this.config.container) {
      this.config.container.style.cursor = enabled ? 'crosshair' : 'default';
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

    // Build projection config
    const projectionConfig: ProjectionConfig = {
      groupingMode: this.config.groupingMode,
      layerVisibility: engineConfig.layerVisibility,
      showSegmentLabels: this.config.showSegmentLabels,
      colorScheme: this.config.colorScheme,
    };

    // Build resources (courts)
    const resources = buildResourcesFromTimelines(timelines, courtMeta, projectionConfig);
    
    // Build events (segments + blocks)
    const segmentEvents = buildEventsFromTimelines(timelines, projectionConfig);
    
    // TODO: Get actual blocks from engine when block query API is added
    const blockEvents: CalendarEvent[] = [];
    
    // Combine events
    let allEvents = [...segmentEvents, ...blockEvents];
    
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
    
    // Only handle block events (not segments or conflicts)
    if (!event.extendedProps?.isBlock) return;
    
    const blockId = parseBlockEventId(event.id);
    if (blockId && this.config.onBlockSelected) {
      this.config.onBlockSelected(blockId);
    }
  };

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
    } else if (this.config.onTimeRangeSelected) {
      this.config.onTimeRangeSelected({ courts, start, end });
    }
    
    // Clear selection
    this.calendar?.unselect();
  };

  /**
   * Handle event drag (move block)
   */
  private handleEventDrop = (info: any): void => {
    const { event, oldEvent, revert } = info;
    
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
    const { event, oldEvent, revert } = info;
    
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
