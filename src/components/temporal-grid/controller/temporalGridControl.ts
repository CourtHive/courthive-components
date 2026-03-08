/**
 * Temporal Grid Controller
 *
 * Manages the CourtTimeline instance and wires it to the Temporal Grid Engine.
 * Following the TMX controlBar pattern: engine handles state, controller handles UI.
 *
 * Responsibilities:
 * - Create and configure CourtTimeline
 * - Convert engine data → timeline format
 * - Handle user interactions → engine commands
 * - Subscribe to engine events → update timeline
 * - Manage view state (selected day, facility, etc.)
 *
 * Design: Stateful controller, but all domain logic stays in engine.
 */

import { tools, temporal, type TemporalEngine } from 'tods-competition-factory';

const { BLOCK_TYPES } = temporal;
type BlockType = temporal.BlockType;
type CourtRef = temporal.CourtRef;
type DayId = temporal.DayId;
import { TemporalViewState } from '../engine/viewState';
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
import { CourtTimeline } from '../timeline/CourtTimeline';
import type { TimelineGroupData, TimelineItemData, MultiRowSpan } from '../timeline/types';

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

  /** Callback when time range is selected */
  onTimeRangeSelected?: (params: { courts: CourtRef[]; start: string; end: string }) => void;

  /** Callback when engine blocks change (for stats bar, external consumers) */
  onBlocksChanged?: () => void;

  /** Callback when a day label is double-clicked (for navigating to 1-Day view) */
  onDayNavigate?: (day: string) => void;
}

// ============================================================================
// Temporal Grid Controller
// ============================================================================

export class TemporalGridControl {
  private readonly engine: TemporalEngine;
  private timeline: CourtTimeline | null = null;
  private readonly config: TemporalGridControlConfig;
  private unsubscribe: (() => void) | null = null;

  // Local item lookup for click handler
  private currentItems: Map<string, TimelineItem> = new Map();

  // Render guard — prevents re-entrant render() calls
  private isRendering = false;

  // Popover manager for block actions
  private popoverManager: BlockPopoverManager = createBlockPopoverManager();

  // View state (UI-specific, not part of engine)
  private viewState: TemporalViewState = new TemporalViewState();
  private currentDay: DayId | null = null;
  private currentView: string = 'day';
  private selectedCourts: Set<CourtRef> = new Set();
  private visibleCourts: Set<string> | null = null; // null = all visible, Set = filtered

  constructor(engine: TemporalEngine, config: TemporalGridControlConfig) {
    this.engine = engine;
    this.config = {
      groupingMode: 'BY_VENUE',
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
    // Set initial day — fall back to first active day or today
    if (this.config.initialDay) {
      this.currentDay = this.config.initialDay;
    } else {
      const days = this.engine.getActiveDays();
      this.currentDay = days.length > 0 ? days[0] : tools.dateTime.extractDate(new Date().toISOString());
    }
    this.viewState.setSelectedDay(this.currentDay);

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
   * Ensure timeline exists. Defers creation to the next macro-task so the
   * container has layout dimensions (matches the working story pattern).
   */
  private ensureTimeline(): void {
    if (this.timeline) return;

    setTimeout(() => {
      if (!this.timeline) {
        this.createTimelineWithData();
      }
    }, 0);
  }

  /**
   * Build the current view data from the engine.
   */
  /**
   * Get the list of days visible in the current view.
   */
  getViewDays(): string[] {
    if (!this.currentDay) return [];
    const preset = VIEW_PRESETS[this.currentView];
    const dayCount = preset ? preset.days : 1;

    if (dayCount <= 0) {
      // days: 0 is the sentinel for "all active tournament days"
      return this.engine.getActiveDays();
    }

    if (dayCount <= 1) return [this.currentDay];

    const allDays = this.engine.getActiveDays();
    const idx = allDays.indexOf(this.currentDay);
    if (idx === -1) return [this.currentDay];
    return allDays.slice(idx, idx + dayCount);
  }

  private buildViewData(): { groups: TimelineGroupData[]; items: TimelineItemData[] } {
    if (!this.currentDay) return { groups: [], items: [] };

    const viewDays = this.getViewDays();
    const courtMeta = this.engine.listCourtMeta();
    const layerVisibility = this.viewState.getLayerVisibility();

    const projectionConfig: ProjectionConfig = {
      groupingMode: this.config.groupingMode,
      layerVisibility,
      showSegmentLabels: this.config.showSegmentLabels,
      colorScheme: this.config.colorScheme
    };

    // Build groups from first day (groups are the same for all days)
    const timelines = this.engine.getDayTimeline(viewDays[0]);
    let groups = buildResourcesFromTimelines(timelines, courtMeta, projectionConfig);
    if (this.visibleCourts !== null && this.visibleCourts.size > 0) {
      groups = groups.filter((g) => this.visibleCourts!.has(String(g.id)));
    }
    const visibleGroupIds =
      this.visibleCourts !== null && this.visibleCourts.size > 0 && groups.length > 0
        ? new Set(groups.map((g) => String(g.id)))
        : null;

    // In single-day view, build items for ALL active days so horizontal
    // panning reveals correctly-shaded adjacent days (daily bounds collapse
    // overnight gaps but all days remain pannable).
    // In multi-day views, only build items for the view days (visible-days
    // mode maps only those days to column space).
    const itemDays = viewDays.length <= 1 ? this.engine.getActiveDays() : viewDays;

    const allSegments: any[] = [];
    const allBlocks: any[] = [];
    for (const day of itemDays) {
      const dayTimelines = this.engine.getDayTimeline(day);
      allSegments.push(...buildEventsFromTimelines(dayTimelines, projectionConfig));
      allBlocks.push(...buildBlockEvents(this.engine.getDayBlocks(day), projectionConfig));
    }

    const filteredSegments = visibleGroupIds
      ? allSegments.filter((e) => visibleGroupIds.has(String(e.group)))
      : allSegments;
    const filteredBlocks = visibleGroupIds ? allBlocks.filter((e) => visibleGroupIds.has(String(e.group))) : allBlocks;

    const items = [...filteredSegments, ...filteredBlocks];

    // Convert to CourtTimeline format (string IDs, consistent types)
    const tlGroups: TimelineGroupData[] = groups.map((g, i) => ({
      id: String(g.id),
      content: typeof g.content === 'string' ? g.content : '',
      order: i,
      courtRef: g.courtRef,
      surface: g.surface,
      indoor: g.indoor,
      hasLights: g.hasLights,
      tags: g.tags
    }));

    const tlItems: TimelineItemData[] = items.map((item) => ({
      id: String(item.id),
      group: String(item.group),
      content: item.content,
      start: item.start,
      end: item.end,
      type: item.type === 'background' ? ('background' as const) : ('range' as const),
      className: item.className,
      style: item.style,
      title: item.title,
      editable: item.editable,
      blockId: item.blockId,
      status: item.status,
      reason: item.reason,
      isBlock: item.isBlock,
      isSegment: item.isSegment,
      isConflict: item.isConflict
    }));

    return { groups: tlGroups, items: tlItems };
  }

  /**
   * Create the timeline with initial data already populated.
   */
  private createTimelineWithData(): void {
    const engineConfig = this.engine.getConfig();
    const currentDay = this.currentDay || tools.dateTime.extractDate(new Date().toISOString());

    const viewDays = this.getViewDays();
    const firstDay = viewDays[0] || currentDay;
    const lastDay = viewDays[viewDays.length - 1] || currentDay;

    const timeRange = this.engine.getVisibleTimeRange(firstDay);
    const lastTimeRange = this.engine.getVisibleTimeRange(lastDay);
    const windowConfig = buildTimelineWindowConfig({
      dayStartTime: timeRange.startTime,
      dayEndTime: timeRange.endTime,
      slotMinutes: engineConfig.slotMinutes,
      day: firstDay
    });

    const preset = VIEW_PRESETS[this.currentView];
    const windowEnd = viewDays.length > 1 ? new Date(`${lastDay}T${lastTimeRange.endTime}:00`) : windowConfig.end;

    // Pan limits span the active tournament days so horizontal scrolling works
    const activeDays = this.engine.getActiveDays();
    const tournamentFirstDay = activeDays[0] || firstDay;
    const tournamentLastDay = activeDays[activeDays.length - 1] || lastDay;
    const firstDayRange = this.engine.getVisibleTimeRange(tournamentFirstDay);
    const lastDayRange = this.engine.getVisibleTimeRange(tournamentLastDay);
    const minDate = new Date(`${tournamentFirstDay}T${firstDayRange.startTime}:00`);
    const maxDate = new Date(`${tournamentLastDay}T${lastDayRange.endTime}:00`);

    // Build initial data
    const { groups, items } = this.buildViewData();

    // Update local item lookup
    this.currentItems.clear();
    for (const item of items) {
      this.currentItems.set(item.id, item as unknown as TimelineItem);
    }

    this.timeline = new CourtTimeline(this.config.container, items, groups, {
      start: windowConfig.start,
      end: windowEnd,
      min: minDate,
      max: maxDate,
      zoomMin: windowConfig.zoomMin,
      zoomMax: maxDate.getTime() - minDate.getTime(),
      snap: (date: Date) => this.snapToMinutes(date, 5),
      rowHeight: 40,
      height: '100%',
      timeAxis: preset ? preset.timeAxis : { scale: 'hour', step: 1 },
      showTooltips: true
    });

    // Set daily bounds to collapse times outside availability window.
    // For multi-day views, also restrict visible days to the view range.
    // For single-day views, bounds still apply but all days remain pannable.
    this.timeline.setDailyBounds(timeRange.startTime, timeRange.endTime);
    if (viewDays.length > 1) {
      this.timeline.setVisibleDays(viewDays);
    }

    // Wire interaction callbacks
    this.timeline.on('click', this.handleTimelineClick);
    this.timeline.onMove(this.handleOnMove);
    this.timeline.onMoving(this.handleOnMoving);
    this.timeline.onMultiRowCreate(this.handleMultiRowCreate);

    // Day label click → navigate to 1-Day view for that day
    this.timeline.onDayClick((dayStr: string) => {
      this.setDay(dayStr);
      this.setViewPreset('day');
      this.config.onDayNavigate?.(dayStr);
    });

    // Notify that initial data is ready so stats bars can populate
    this.config.onBlocksChanged?.();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /** Set the selected day (public API) */
  setDay(day: DayId): void {
    if (this.currentDay === day) return;

    this.currentDay = day;
    this.viewState.setSelectedDay(day);

    // Update timeline window
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

  /** Set a named view preset (day/days3/week/all) */
  setViewPreset(viewKey: string): void {
    const preset = VIEW_PRESETS[viewKey];
    if (!preset || !this.timeline || !this.currentDay) return;

    this.currentView = viewKey;

    const viewDays = this.getViewDays();
    const firstDay = viewDays[0];
    const lastDay = viewDays[viewDays.length - 1];

    const timeRange = this.engine.getVisibleTimeRange(firstDay);
    const lastTimeRange = this.engine.getVisibleTimeRange(lastDay);

    // Batch all updates to avoid intermediate renders with stale data
    this.timeline.beginBatchUpdate();

    // Set daily bounds to collapse times outside availability window.
    // For multi-day views, also restrict visible days to the view range.
    const isMultiDay = preset.days === 0 || preset.days > 1;
    this.timeline.setDailyBounds(timeRange.startTime, timeRange.endTime);
    if (isMultiDay) {
      this.timeline.setVisibleDays(viewDays);
    } else {
      this.timeline.clearVisibleDays();
    }

    const windowStart = new Date(`${firstDay}T${timeRange.startTime}:00`);
    const windowEnd = new Date(`${lastDay}T${lastTimeRange.endTime}:00`);

    this.timeline.setWindow(windowStart, windowEnd, { animation: false });
    this.timeline.setOptions({ timeAxis: preset.timeAxis });

    // Build and apply new data within the batch
    const { groups, items } = this.buildViewData();
    this.currentItems.clear();
    for (const item of items) {
      this.currentItems.set(item.id, item as unknown as TimelineItem);
    }
    this.timeline.setGroups(groups);
    this.timeline.setItems(items);

    // End batch — triggers a single render with all state consistent
    this.timeline.endBatchUpdate();

    this.config.onBlocksChanged?.();
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
    this.viewState.setLayerVisibility(layerId, visible);
    this.render();
  }

  /** Refresh the calendar display */
  refresh(): void {
    this.updateTimelineWindow();
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
    const viewDays = this.getViewDays();
    const firstDay = viewDays[0] || this.currentDay;
    const lastDay = viewDays[viewDays.length - 1] || this.currentDay;

    const timeRange = this.engine.getVisibleTimeRange(firstDay);
    const lastTimeRange = this.engine.getVisibleTimeRange(lastDay);
    const windowConfig = buildTimelineWindowConfig({
      dayStartTime: timeRange.startTime,
      dayEndTime: timeRange.endTime,
      slotMinutes: engineConfig.slotMinutes,
      day: firstDay
    });

    const preset = VIEW_PRESETS[this.currentView];
    const windowEnd = viewDays.length > 1 ? new Date(`${lastDay}T${lastTimeRange.endTime}:00`) : windowConfig.end;

    // Pan limits span the active tournament days
    const activeDays = this.engine.getActiveDays();
    const tournamentFirstDay = activeDays[0] || firstDay;
    const tournamentLastDay = activeDays[activeDays.length - 1] || lastDay;
    const firstDayRange = this.engine.getVisibleTimeRange(tournamentFirstDay);
    const lastDayRange = this.engine.getVisibleTimeRange(tournamentLastDay);
    const minDate = new Date(`${tournamentFirstDay}T${firstDayRange.startTime}:00`);
    const maxDate = new Date(`${tournamentLastDay}T${lastDayRange.endTime}:00`);

    // Batch updates to avoid intermediate renders
    this.timeline.beginBatchUpdate();

    // Set daily bounds to collapse times outside availability window.
    // For multi-day views, also restrict visible days to the view range.
    this.timeline.setDailyBounds(timeRange.startTime, timeRange.endTime);
    if (viewDays.length > 1) {
      this.timeline.setVisibleDays(viewDays);
    } else {
      this.timeline.clearVisibleDays();
    }

    this.timeline.setOptions({
      min: minDate,
      max: maxDate
    });

    this.timeline.setWindow(windowConfig.start, windowEnd, { animation: false });

    if (preset) {
      this.timeline.setOptions({ timeAxis: preset.timeAxis });
    }

    this.timeline.endBatchUpdate();
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
        this.currentItems.set(item.id, item as unknown as TimelineItem);
      }

      // Update timeline data
      this.timeline.setGroups(groups);
      this.timeline.setItems(items);
    } finally {
      this.isRendering = false;
    }
  }

  // ============================================================================
  // CourtTimeline Interaction Handlers
  // ============================================================================

  /**
   * onMove: Called when user finishes dragging or resizing an item.
   * Returns true to accept, false to reject.
   */
  private handleOnMove = (item: { id: string; group: string; start: Date; end: Date }): boolean => {
    const blockId = parseBlockEventId(item.id);
    if (!blockId) return false;

    const newCourt = parseResourceId(item.group);
    const newStart = this.toLocalISO(item.start);
    const newEnd = this.toLocalISO(item.end);

    // Move/resize block in engine
    const result = this.engine.moveBlock({
      blockId,
      newTimeRange: { start: newStart, end: newEnd },
      newCourt: newCourt || undefined
    });

    // On conflict → reject
    if (result.conflicts.some((c) => c.severity === 'ERROR')) {
      this.showConflictDialog(result.conflicts);
      return false;
    }

    this.render();
    return true;
  };

  /**
   * onMoving: Live validation during drag (optional visual feedback).
   * Destroys active popover, clamps to court availability.
   * Returns clamped start/end, or null to reject.
   */
  private handleOnMoving = (item: {
    id: string;
    group: string;
    start: Date;
    end: Date;
  }): { start: Date; end: Date } | null => {
    this.popoverManager.destroy();

    // Look up the original item to check if it's a segment
    const originalItem = this.currentItems.get(item.id);
    if (originalItem && (originalItem.isSegment || originalItem.type === 'background')) {
      return null; // Reject — segments are not user-editable
    }

    let { start, end } = item;

    // Clamp to court availability window
    const courtRef = parseResourceId(item.group);
    if (courtRef) {
      const itemDay = start.toISOString().slice(0, 10);
      const avail = this.engine.getCourtAvailability(courtRef, itemDay);
      const availStart = new Date(`${itemDay}T${avail.startTime}:00`);
      const availEnd = new Date(`${itemDay}T${avail.endTime}:00`);
      if (start < availStart) start = availStart;
      if (end > availEnd) end = availEnd;
    }

    return { start, end };
  };

  /**
   * Timeline click handler: Routes to popover based on item type.
   * Handles ghost confirmation (multi-row create) and block click → popover.
   */
  private handleTimelineClick = (properties: { item: string; event: PointerEvent }): void => {
    const itemId = properties.item;
    if (!itemId) {
      this.popoverManager.destroy();
      return;
    }

    const item = this.currentItems.get(itemId);
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

    // Range / block item → show popover
    const blockId = parseBlockEventId(itemId);
    if (!blockId) return;

    const itemEl =
      (properties.event?.target as Element)?.closest?.('.tg-item') ??
      this.config.container.querySelector(`[data-item-id="${itemId}"]`);

    if (itemEl) {
      const day = String(item.start).slice(0, 10);
      this.popoverManager.showForEngineBlock(itemEl as HTMLElement, {
        itemId,
        blockId,
        engine: this.engine,
        day,
        onBlockChanged: () => this.render()
      });
    }

    if (this.config.onBlockSelected) {
      this.config.onBlockSelected(blockId);
    }
  };

  /**
   * Multi-row ghost creation handler.
   * Called when user confirms a ghost spanning one or more court rows.
   * Creates one block per court via engine.applyBlock.
   */
  private handleMultiRowCreate = (span: MultiRowSpan): void => {
    const courts: CourtRef[] = [];
    for (const groupId of span.groupIds) {
      const court = parseResourceId(groupId);
      if (court) courts.push(court);
    }

    if (courts.length === 0) return;

    const startStr = this.toLocalISO(span.startTime);
    const endStr = this.toLocalISO(span.endTime);

    const result = this.engine.applyBlock({
      courts,
      timeRange: { start: startStr, end: endStr },
      type: BLOCK_TYPES.BLOCKED,
      reason: 'New Block'
    });

    this.render();

    // Show popover on the first created block
    if (result.applied.length > 0) {
      const newBlockId = result.applied[0].block.id;
      const newItemId = `block-${newBlockId}`;
      const day = startStr.slice(0, 10);
      setTimeout(() => {
        const el = this.config.container.querySelector(`[data-item-id="${newItemId}"]`);
        if (el) {
          this.popoverManager.showForEngineBlock(el as HTMLElement, {
            itemId: newItemId,
            blockId: newBlockId,
            engine: this.engine,
            day,
            onBlockChanged: () => this.render()
          });
        }
      }, 50);
    }

    // Notify external consumers
    if (this.config.onTimeRangeSelected) {
      this.config.onTimeRangeSelected({ courts, start: startStr, end: endStr });
    }
  };

  // ============================================================================
  // Block Operations
  // ============================================================================

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
  getTimeline(): CourtTimeline | null {
    return this.timeline;
  }

  /** Get engine instance */
  getEngine(): TemporalEngine {
    return this.engine;
  }

  /** Get view state (for external consumers to subscribe to view changes) */
  getViewState(): TemporalViewState {
    return this.viewState;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/** Create a temporal grid controller */
export function createTemporalGridControl(
  engine: TemporalEngine,
  config: TemporalGridControlConfig
): TemporalGridControl {
  return new TemporalGridControl(engine, config);
}
