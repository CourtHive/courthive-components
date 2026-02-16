/**
 * Temporal Grid Controller
 *
 * Manages the vis-timeline instance and wires it to the Temporal Grid Engine.
 * Following the TMX controlBar pattern: engine handles state, controller handles UI.
 *
 * Responsibilities:
 * - Create and configure vis-timeline
 * - Convert engine data → timeline format
 * - Handle user interactions → engine commands
 * - Subscribe to engine events → update timeline
 * - Manage view state (selected day, facility, etc.)
 *
 * Design: Stateful controller, but all domain logic stays in engine.
 */

import { Timeline } from 'vis-timeline/standalone';
import { tools } from 'tods-competition-factory';
import type { TemporalGridEngine } from '../engine/temporalGridEngine';
import { clampDragToCollisions, findBlocksContainingTime, sortBlocksByStart } from '../engine/collisionDetection';
import type { BlockType, CourtRef, DayId } from '../engine/types';
import {
  buildBlockEvents,
  buildEventsFromTimelines,
  buildResourcesFromTimelines,
  buildTimelineWindowConfig,
  DEFAULT_COLOR_SCHEME,
  parseBlockEventId,
  parseResourceId,
  type TimelineItem,
  type ProjectionConfig,
  type ResourceGroupingMode
} from './viewProjections';
import { createBlockPopoverManager, type BlockPopoverManager } from '../ui/blockPopover';
import { VIEW_PRESETS } from '../ui/viewToolbar';

// ============================================================================
// Controller Configuration
// ============================================================================

export interface TemporalGridControlConfig {
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

  /** Callback when time range is selected (for painting) */
  onTimeRangeSelected?: (params: { courts: CourtRef[]; start: string; end: string }) => void;

  /** Callback when engine blocks change (for stats bar, external consumers) */
  onBlocksChanged?: () => void;
}

// ============================================================================
// Temporal Grid Controller
// ============================================================================

export class TemporalGridControl {
  private readonly engine: TemporalGridEngine;
  private timeline: Timeline | null = null;
  private readonly config: TemporalGridControlConfig;
  private unsubscribe: (() => void) | null = null;

  // Local item lookup for click handler
  private currentItems: Map<string, TimelineItem> = new Map();

  // Render guard — prevents re-entrant render() calls
  private isRendering = false;

  // Popover manager for block actions
  private popoverManager: BlockPopoverManager = createBlockPopoverManager();

  // Drag guard — suppresses click handler after drag
  private justDragged = false;

  // View state
  private currentDay: DayId | null = null;
  private currentView: string = 'day';
  private selectedCourts: Set<CourtRef> = new Set();
  private currentPaintType: BlockType | 'DELETE' = 'BLOCKED';
  private isPaintMode = false;
  private visibleCourts: Set<string> | null = null; // null = all visible, Set = filtered

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
    // Set initial day
    if (this.config.initialDay) {
      this.currentDay = this.config.initialDay;
      this.engine.setSelectedDay(this.config.initialDay);
    }

    // Set initial view
    if (this.config.initialView) {
      this.currentView = this.config.initialView;
    }

    // Subscribe to engine events
    this.unsubscribe = this.engine.subscribe(this.handleEngineEvent);

    // Create timeline — deferred if container has no layout yet
    this.ensureTimeline();
  }

  /**
   * Ensure timeline exists. If the container has layout, create immediately
   * with initial data. If not (e.g., Storybook hasn't attached the element
   * to the DOM yet), poll via requestAnimationFrame until layout is available.
   */
  private ensureTimeline(): void {
    if (this.timeline) return;

    const tryCreate = () => {
      if (this.timeline) return;
      const height = this.config.container.clientHeight;
      if (height > 0) {
        this.createTimelineWithData(height);
      } else {
        requestAnimationFrame(tryCreate);
      }
    };

    tryCreate();
  }

  /**
   * Build the current view data from the engine.
   */
  private buildViewData(): { groups: any[]; items: any[] } {
    if (!this.currentDay) return { groups: [], items: [] };

    const timelines = this.engine.getDayTimeline(this.currentDay);
    const courtMeta = this.engine.listCourtMeta();
    const layerVisibility = (this.engine as any).layerVisibility || new Map<BlockType, boolean>();

    const projectionConfig: ProjectionConfig = {
      groupingMode: this.config.groupingMode,
      layerVisibility,
      showSegmentLabels: this.config.showSegmentLabels,
      colorScheme: this.config.colorScheme
    };

    let groups = buildResourcesFromTimelines(timelines, courtMeta, projectionConfig);
    if (this.visibleCourts !== null && this.visibleCourts.size > 0) {
      groups = groups.filter((g) => this.visibleCourts!.has(String(g.id)));
    }

    const segmentItems = buildEventsFromTimelines(timelines, projectionConfig);
    let filteredSegmentItems = segmentItems;
    if (this.visibleCourts !== null && this.visibleCourts.size > 0 && groups.length > 0) {
      const visibleGroupIds = new Set(groups.map((g) => String(g.id)));
      filteredSegmentItems = segmentItems.filter((e) => visibleGroupIds.has(String(e.group)));
    }

    const blocks = this.engine.getDayBlocks(this.currentDay);
    const blockItems = buildBlockEvents(blocks, projectionConfig);
    let filteredBlockItems = blockItems;
    if (this.visibleCourts !== null && this.visibleCourts.size > 0 && groups.length > 0) {
      const visibleGroupIds = new Set(groups.map((g) => String(g.id)));
      filteredBlockItems = blockItems.filter((e) => visibleGroupIds.has(String(e.group)));
    }

    const items = [...filteredSegmentItems, ...filteredBlockItems];
    return { groups, items };
  }

  /**
   * Create the timeline with initial data already populated.
   * Passing data to the constructor avoids the empty→populated transition
   * that causes extra redraws.
   */
  private createTimelineWithData(height: number): void {
    const engineConfig = this.engine.getConfig();
    const currentDay = this.currentDay || tools.dateTime.extractDate(new Date().toISOString());

    const timeRange = this.engine.getVisibleTimeRange(currentDay);
    const windowConfig = buildTimelineWindowConfig({
      dayStartTime: timeRange.startTime,
      dayEndTime: timeRange.endTime,
      slotMinutes: engineConfig.slotMinutes,
      day: currentDay
    });

    let windowEnd = windowConfig.end;
    let maxDate = windowConfig.max;

    const preset = VIEW_PRESETS[this.currentView];
    if (preset && preset.days > 1) {
      const multiDayEnd = new Date(windowConfig.start);
      multiDayEnd.setDate(multiDayEnd.getDate() + preset.days);
      const dayEndParts = engineConfig.dayEndTime.split(':');
      multiDayEnd.setHours(parseInt(dayEndParts[0]), parseInt(dayEndParts[1]), 0, 0);
      windowEnd = multiDayEnd;
      maxDate = multiDayEnd;
    }

    // Build initial data so the first layout already has correct content
    const { groups, items } = this.buildViewData();

    // Update local item lookup
    this.currentItems.clear();
    for (const item of items) {
      this.currentItems.set(String(item.id), item);
    }

    this.timeline = new Timeline(this.config.container, items as any, groups as any, {
      // Time window
      start: windowConfig.start,
      end: windowEnd,
      min: windowConfig.min,
      max: maxDate,
      zoomMin: windowConfig.zoomMin,
      zoomMax: windowConfig.zoomMax,

      // Editing
      editable: {
        add: true,
        updateTime: true,
        updateGroup: true,
        remove: false
      },

      // Snap to 5-minute increments
      snap: (date: Date) => this.snapToMinutes(date, 5),

      // Interaction callbacks
      onAdd: this.handleOnAdd,
      onMove: this.handleOnMove,
      onMoving: this.handleOnMoving,

      // Layout
      // - verticalScroll: false → timeline auto-sizes to content, CSS container scrolls
      //   This avoids vis-timeline's internal scrollbar-width oscillation bug.
      // - autoResize: false → no resize observer feedback loop
      // - height: fixed pixel → stable offsetHeight reads, no redraw oscillation
      orientation: { axis: 'top', item: 'top' },
      stack: false,
      groupHeightMode: 'fixed' as const,
      showCurrentTime: false,
      verticalScroll: false,
      horizontalScroll: true,
      zoomKey: 'ctrlKey',
      height,
      autoResize: false,

      // Group ordering
      groupOrder: 'order',

      // Tooltip
      showTooltips: true,

      // Formatting
      format: {
        minorLabels: {
          minute: 'HH:mm',
          hour: 'HH:mm'
        },
        majorLabels: {
          hour: 'ddd D MMM',
          day: 'ddd D MMM'
        }
      },

      // Time axis (from current view preset)
      timeAxis: preset ? preset.timeAxis : { scale: 'hour', step: 1 },

      // Items always draggable (for block items that are editable)
      itemsAlwaysDraggable: {
        item: true,
        range: true
      },

      // Data attributes for DOM querying
      dataAttributes: ['id'],
    });

    // Register click handler for block actions
    this.timeline.on('click', this.handleTimelineClick);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /** Set the selected day (public API - updates engine) */
  setDay(day: DayId): void {
    if (this.currentDay === day) return;

    this.currentDay = day;
    this.engine.setSelectedDay(day);

    // Update timeline window
    this.updateTimelineWindow();
    this.render();
  }

  /** Update day display without triggering engine (internal use) */
  private updateDayDisplay(day: DayId): void {
    if (this.currentDay === day) return;
    this.currentDay = day;
    this.updateTimelineWindow();
    this.render();
  }

  /** Get current selected day */
  getDay(): DayId | null {
    return this.currentDay;
  }

  /** Set view mode */
  setView(view: string): void {
    this.currentView = view;
    this.updateTimelineWindow();
  }

  /** Set a named view preset (day/tournament/week) */
  setViewPreset(viewKey: string): void {
    const preset = VIEW_PRESETS[viewKey];
    if (!preset || !this.timeline || !this.currentDay) return;

    this.currentView = viewKey;
    const engineConfig = this.engine.getConfig();
    const windowStart = new Date(`${this.currentDay}T${engineConfig.dayStartTime}:00`);
    const windowEnd = new Date(windowStart.getTime() + preset.days * 16 * 60 * 60 * 1000);

    this.timeline.setWindow(windowStart, windowEnd, { animation: false });
    this.timeline.setOptions({ timeAxis: preset.timeAxis });
  }

  /** Set paint mode and block type (or DELETE action) */
  setPaintMode(enabled: boolean, blockType?: BlockType | 'DELETE'): void {
    this.isPaintMode = enabled;

    if (blockType) {
      this.currentPaintType = blockType;
    }

    // Update cursor style
    if (this.config.container) {
      this.config.container.style.cursor = enabled ? 'crosshair' : 'default';
    }
  }

  /** Select courts for multi-court operations */
  setSelectedCourts(courts: CourtRef[]): void {
    this.selectedCourts = new Set(courts);
  }

  /** Get selected courts */
  getSelectedCourts(): CourtRef[] {
    return Array.from(this.selectedCourts);
  }

  /** Set which courts are visible in the timeline */
  setVisibleCourts(courts: Set<string> | null): void {
    if (courts && courts.size === 0) {
      this.visibleCourts = null;
    } else {
      this.visibleCourts = courts;
    }
    this.render();
  }

  /** Set layer visibility */
  setLayerVisibility(layerId: BlockType, visible: boolean): void {
    this.engine.setLayerVisibility(layerId, visible);
    this.render();
  }

  /** Refresh the calendar display */
  refresh(): void {
    this.render();
  }

  /** Destroy the controller and cleanup */
  destroy(): void {
    this.popoverManager.destroy();

    if (this.unsubscribe) {
      this.unsubscribe();
    }

    if (this.timeline) {
      this.timeline.destroy();
      this.timeline = null;
    }
  }

  // ============================================================================
  // Timeline Window Management
  // ============================================================================

  private updateTimelineWindow(): void {
    if (!this.timeline || !this.currentDay) return;

    const engineConfig = this.engine.getConfig();
    const timeRange = this.engine.getVisibleTimeRange(this.currentDay);
    const windowConfig = buildTimelineWindowConfig({
      dayStartTime: timeRange.startTime,
      dayEndTime: timeRange.endTime,
      slotMinutes: engineConfig.slotMinutes,
      day: this.currentDay
    });

    let windowEnd = windowConfig.end;
    let maxDate = windowConfig.max;

    const preset = VIEW_PRESETS[this.currentView];
    if (preset && preset.days > 1) {
      const multiDayEnd = new Date(windowConfig.start);
      multiDayEnd.setDate(multiDayEnd.getDate() + preset.days);
      const dayEndParts = engineConfig.dayEndTime.split(':');
      multiDayEnd.setHours(parseInt(dayEndParts[0]), parseInt(dayEndParts[1]), 0, 0);
      windowEnd = multiDayEnd;
      maxDate = multiDayEnd;
    }

    this.timeline.setOptions({
      min: windowConfig.min,
      max: maxDate
    });

    this.timeline.setWindow(windowConfig.start, windowEnd, { animation: false });

    if (preset) {
      this.timeline.setOptions({ timeAxis: preset.timeAxis });
    }
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  private render(): void {
    if (!this.currentDay) return;
    if (this.isRendering) return;

    // If timeline hasn't been created yet, try now
    if (!this.timeline) {
      this.ensureTimeline();
      return;
    }

    this.isRendering = true;
    try {
      const { groups, items } = this.buildViewData();

      // Update local item lookup map
      this.currentItems.clear();
      for (const item of items) {
        this.currentItems.set(String(item.id), item);
      }

      // Update timeline data
      this.timeline.setGroups(groups as any);
      this.timeline.setItems(items as any);
    } finally {
      this.isRendering = false;
    }
  }

  // ============================================================================
  // vis-timeline Interaction Handlers
  // ============================================================================

  /**
   * onAdd: Called when user double-clicks or drags to create a new item.
   *
   * In paint mode: applies block directly via engine.
   * Otherwise: shows a temporary box item, then opens type-picker popover.
   */
  private handleOnAdd = (item: any, callback: (item: any) => void): void => {
    const groupId = String(item.group);
    const court = parseResourceId(groupId);
    if (!court) {
      callback(null);
      return;
    }

    if (this.isPaintMode) {
      // Always reject the native add — engine re-renders via subscription
      callback(null);

      if (this.currentPaintType === 'DELETE') return;

      // Get start/end as timestamps
      const startTime = new Date(item.start).getTime();
      const endTime = new Date(item.end).getTime();

      // Get existing blocks on this court for collision detection
      const existingBlocks = this.engine.getDayBlocks(this.currentDay);
      const blocksOnCourt = existingBlocks.filter(
        (b) =>
          b.court.tournamentId === court.tournamentId &&
          b.court.facilityId === court.facilityId &&
          b.court.courtId === court.courtId
      );

      // Check if starting inside an existing block
      const blocksContaining = findBlocksContainingTime(startTime, blocksOnCourt);
      if (blocksContaining.length > 0) return;

      // Sort and clamp
      sortBlocksByStart(blocksOnCourt);
      const clamped = clampDragToCollisions(startTime, endTime, blocksOnCourt);

      // Snap
      const snappedStart = this.snapToMinutes(new Date(clamped.start), 5);
      const snappedEnd = this.snapToMinutes(new Date(clamped.end), 5);

      if (snappedEnd.getTime() <= snappedStart.getTime()) return;

      // Apply block via engine
      this.engine.applyBlock({
        type: this.currentPaintType,
        courts: [court],
        timeRange: {
          start: this.toLocalISO(snappedStart),
          end: this.toLocalISO(snappedEnd)
        }
      });
    } else {
      // Show a temporary box item (with umbilical line); click will convert to range + popover
      item.content = item.content || 'New Block';
      item.style = 'background-color: #607D8B; border-color: #37474F; color: white;';
      item.editable = { updateTime: true, updateGroup: true, remove: false };
      callback(item);
    }
  };

  /**
   * onMove: Replaces handleEventDrop + handleEventResize.
   * Called when user finishes dragging or resizing an item.
   */
  private handleOnMove = (item: any, callback: (item: any) => void): void => {
    this.justDragged = true;
    setTimeout(() => (this.justDragged = false), 300);

    // Only handle block items — temp box items pass through
    if (!item.isBlock) {
      const blockId = parseBlockEventId(String(item.id));
      if (!blockId) {
        // Temporary box item (not yet in engine) — let vis-timeline handle it
        callback(item);
        return;
      }
    }

    const blockId = parseBlockEventId(String(item.id));
    if (!blockId) {
      callback(null);
      return;
    }

    const newGroupId = String(item.group);
    const newCourt = parseResourceId(newGroupId);

    const newStart = this.toLocalISO(new Date(item.start));
    const newEnd = this.toLocalISO(new Date(item.end));

    // Move/resize block in engine
    const result = this.engine.moveBlock({
      blockId,
      newTimeRange: { start: newStart, end: newEnd },
      newCourt: newCourt || undefined
    });

    // On conflict → reject by passing null
    if (result.conflicts.some((c) => c.severity === 'ERROR')) {
      callback(null);
      this.showConflictDialog(result.conflicts);
    } else {
      callback(item);
      this.render();
    }
  };

  /**
   * onMoving: Live validation during drag (optional visual feedback).
   * Destroys active popover, clamps to court availability, and allows the move.
   */
  private handleOnMoving = (item: any, callback: (item: any) => void): void => {
    this.popoverManager.destroy();

    // Allow moving block items and temp box items, not segments or backgrounds
    if (!item.isBlock && item.type !== 'box') {
      callback(null);
      return;
    }

    // Clamp to court availability window
    if (item.group && this.currentDay) {
      const courtRef = parseResourceId(String(item.group));
      if (courtRef) {
        const avail = this.engine.getCourtAvailability(courtRef, this.currentDay);
        const availStart = new Date(`${this.currentDay}T${avail.startTime}:00`);
        const availEnd = new Date(`${this.currentDay}T${avail.endTime}:00`);
        if (new Date(item.start) < availStart) item.start = availStart;
        if (new Date(item.end) > availEnd) item.end = availEnd;
      }
    }

    callback(item);
  };

  /**
   * Timeline click handler: Routes to popover or delete based on mode.
   * Supports box→range conversion for double-click-created items.
   */
  private handleTimelineClick = (properties: any): void => {
    if (this.justDragged) return;

    if (!properties.item) {
      this.popoverManager.destroy();
      return;
    }

    const itemId = String(properties.item);
    const item = (this.timeline as any)?.itemsData?.get(properties.item) as any;
    if (!item) {
      this.popoverManager.destroy();
      return;
    }

    // Skip segment/background items
    if (item.isSegment || item.type === 'background') {
      this.popoverManager.destroy();
      return;
    }

    // Toggle: clicking the same block that has an open popover closes it
    if (this.popoverManager.isActiveFor(itemId)) {
      this.popoverManager.destroy();
      return;
    }

    // If in paint mode with DELETE selected, delete the block immediately
    if (this.isPaintMode && this.currentPaintType === 'DELETE') {
      const blockId = parseBlockEventId(itemId);
      if (blockId) this.deleteBlock(blockId);
      return;
    }

    // Box/point item (from double-click) → convert to range via engine
    if (item.type !== 'range' && !item.isBlock) {
      const courtRef = parseResourceId(String(item.group));
      if (!courtRef) return;
      const start = this.toLocalISO(new Date(item.start));
      const endTime = new Date(new Date(item.start).getTime() + 60 * 60 * 1000);
      const result = this.engine.applyBlock({
        courts: [courtRef],
        timeRange: { start, end: this.toLocalISO(endTime) },
        type: 'BLOCKED',
        reason: 'New Block',
      });
      this.render();

      // Show popover on the newly created engine block
      if (result.applied.length > 0) {
        const newBlockId = result.applied[0].block.id;
        const newItemId = `block-${newBlockId}`;
        const day = this.currentDay || start.slice(0, 10);
        setTimeout(() => {
          const el = this.config.container.querySelector(`.vis-item[data-id="${newItemId}"]`);
          if (el) {
            this.popoverManager.showForEngineBlock(el as HTMLElement, {
              itemId: newItemId,
              blockId: newBlockId,
              engine: this.engine,
              day,
              onBlockChanged: () => this.render(),
            });
          }
        }, 50);
      }
      return;
    }

    // Range / block item → show popover
    const blockId = parseBlockEventId(itemId);
    if (!blockId) return;

    const itemEl =
      (properties.event?.target as Element)?.closest?.('.vis-item') ??
      this.config.container.querySelector(`.vis-item[data-id="${itemId}"]`);

    if (itemEl) {
      const day = this.currentDay || '';
      this.popoverManager.showForEngineBlock(itemEl as HTMLElement, {
        itemId,
        blockId,
        engine: this.engine,
        day,
        onBlockChanged: () => this.render(),
      });
    }

    if (this.config.onBlockSelected) {
      this.config.onBlockSelected(blockId);
    }
  };

  // ============================================================================
  // Block Operations
  // ============================================================================

  /** Delete a block */
  private deleteBlock(blockId: string): void {
    const result = this.engine.removeBlock(blockId);
    if (result.conflicts.some((c) => c.severity === 'ERROR')) {
      this.showConflictDialog(result.conflicts);
    }
  }

  /** Get the popover manager (for external access) */
  getPopoverManager(): BlockPopoverManager {
    return this.popoverManager;
  }

  // ============================================================================
  // Engine Event Handler
  // ============================================================================

  private handleEngineEvent = (event: any): void => {
    switch (event.type) {
      case 'STATE_CHANGED':
      case 'BLOCKS_CHANGED':
        this.render();
        if (event.type === 'BLOCKS_CHANGED' && this.config.onBlocksChanged) {
          this.config.onBlocksChanged();
        }
        break;

      case 'VIEW_CHANGED':
        if (event.payload.day) {
          this.updateDayDisplay(event.payload.day);
        }
        break;

      case 'CONFLICTS_CHANGED':
        if (this.config.showConflicts) {
          this.render();
        }
        break;

      case 'AVAILABILITY_CHANGED':
        this.updateTimelineWindow();
        this.render();
        break;
    }
  };

  // ============================================================================
  // UI Helpers
  // ============================================================================

  /** Snap a date to the nearest N-minute increment */
  private snapToMinutes(date: Date, minutes: number): Date {
    const ms = date.getTime();
    const minutesInMs = minutes * 60 * 1000;
    const rounded = Math.round(ms / minutesInMs) * minutesInMs;
    return new Date(rounded);
  }

  /**
   * Format a Date as a local-time ISO string (no timezone offset).
   * Engine stores times as wall-clock strings like "2026-06-15T09:00:00".
   * toISOString() converts to UTC which shifts the time by the local offset.
   */
  private toLocalISO(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
      date.getMinutes()
    )}:${pad(date.getSeconds())}`;
  }

  /** Show conflict dialog */
  private showConflictDialog(conflicts: any[]): void {
    const messages = conflicts
      .filter((c) => c.severity === 'ERROR')
      .map((c) => c.message)
      .join('\n');

    alert(`Cannot complete operation:\n\n${messages}`);
  }

  /** Get timeline instance (for advanced usage) */
  getTimeline(): Timeline | null {
    return this.timeline;
  }

  /** Get engine instance */
  getEngine(): TemporalGridEngine {
    return this.engine;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/** Create a temporal grid controller */
export function createTemporalGridControl(
  engine: TemporalGridEngine,
  config: TemporalGridControlConfig
): TemporalGridControl {
  return new TemporalGridControl(engine, config);
}
