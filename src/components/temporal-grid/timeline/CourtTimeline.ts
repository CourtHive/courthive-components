/**
 * CourtTimeline — Assembler with vis-timeline-compatible API.
 *
 * Wires together TimeScale, TimeAxis, RowLayout, ItemRenderer, and
 * InteractionManager into a single public surface.
 *
 * Public API mirrors vis-timeline's essentials:
 *   setGroups, setItems, setWindow, setOptions, on, destroy
 * Plus new:
 *   onMultiRowCreate
 */

import { TimeScale } from './TimeScale';
import { TimeAxis } from './TimeAxis';
import { RowLayout } from './RowLayout';
import { ItemRenderer } from './ItemRenderer';
import { InteractionManager } from './InteractionManager';
import type {
  TimelineGroupData,
  TimelineItemData,
  TimelineOptions,
  TimelineCallbacks,
  MultiRowSpan,
} from './types';

export class CourtTimeline {
  private options: TimelineOptions;
  private callbacks: TimelineCallbacks = {};

  // Layers
  private scale: TimeScale;
  private timeAxis: TimeAxis;
  private layout: RowLayout;
  private renderer: ItemRenderer;
  private interaction: InteractionManager;

  // DOM structure
  private rootEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private resizeObserver: ResizeObserver | null = null;

  // Batch-update flag: when true, renderAll() is deferred
  private _batchUpdating = false;

  // Event listeners (vis-timeline compatible 'on' API)
  private eventListeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor(
    container: HTMLElement,
    items: TimelineItemData[],
    groups: TimelineGroupData[],
    options: TimelineOptions = {},
  ) {
    this.options = { rowHeight: 40, ...options };

    // Determine initial time window
    const now = new Date();
    const start = options.start || now;
    const end = options.end || new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const width = container.clientWidth || 800;

    // Build layers
    this.scale = new TimeScale(start, end, width);
    if (options.min || options.max || options.zoomMin || options.zoomMax) {
      this.scale.setLimits({
        min: options.min,
        max: options.max,
        zoomMin: options.zoomMin,
        zoomMax: options.zoomMax,
      });
    }

    this.timeAxis = new TimeAxis(this.scale, options.timeAxis as { scale: string; step: number });
    this.layout = new RowLayout(this.options.rowHeight);
    this.renderer = new ItemRenderer(this.scale, this.layout);

    const snapMinutes = 5;

    this.interaction = new InteractionManager(
      this.scale,
      this.layout,
      this.renderer,
      this.callbacks,
      snapMinutes,
      options.enablePinchZoom ?? false,
    );

    // Build DOM
    this.rootEl = document.createElement('div');
    this.rootEl.className = 'tg-timeline';
    if (options.height) {
      this.rootEl.style.height = options.height;
    }

    // Axis header: CSS Grid with spacer spanning both rows
    const axisHeader = document.createElement('div');
    axisHeader.className = 'tg-axis-header';
    const axisSpacer = document.createElement('div');
    axisSpacer.className = 'tg-axis-spacer';
    axisHeader.appendChild(axisSpacer);
    axisHeader.appendChild(this.timeAxis.getDayElement());
    axisHeader.appendChild(this.timeAxis.getHourElement());
    this.rootEl.appendChild(axisHeader);

    // Body: label panel + scrollable content
    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tg-body';

    this.bodyEl.appendChild(this.layout.getLabelPanel());

    // Scrollable content wrapper
    const scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'tg-scroll-wrapper';
    scrollWrapper.appendChild(this.layout.getContentArea());
    this.bodyEl.appendChild(scrollWrapper);

    this.rootEl.appendChild(this.bodyEl);
    container.appendChild(this.rootEl);

    // Sync label panel scroll with content scroll
    scrollWrapper.addEventListener('scroll', () => {
      this.layout.getLabelPanel().scrollTop = scrollWrapper.scrollTop;
    });

    // Set scroll container for auto-scroll
    this.interaction.setScrollContainer(scrollWrapper);

    // Attach wheel listener to the root element so it captures events
    // over the entire timeline component (not just the content rows)
    this.interaction.setWheelTarget(this.rootEl);

    // Wire interaction scale-change callback
    this.interaction.onScaleChanged = () => this.renderAll();

    // Set initial data
    this.layout.setGroups(groups);
    this.renderer.setItems(items);
    this.interaction.setItems(items);

    // Attach interaction handlers
    this.interaction.attach();

    // Initial render
    this.renderAll();

    // ResizeObserver
    this.resizeObserver = new ResizeObserver(() => {
      const newWidth = scrollWrapper.clientWidth || container.clientWidth;
      this.scale.setWidth(newWidth);
      this.renderAll();
    });
    this.resizeObserver.observe(scrollWrapper);
  }


  // ============================================================================
  // Public API (vis-timeline compatible)
  // ============================================================================

  setGroups(groups: TimelineGroupData[]): void {
    this.layout.setGroups(groups);
    this.renderAll();
  }

  setItems(items: TimelineItemData[]): void {
    this.renderer.setItems(items);
    this.interaction.setItems(items);
    this.renderAll();
  }

  setWindow(start: Date, end: Date, _opts?: { animation?: boolean }): void {
    this.scale.setWindow(start, end);
    this.renderAll();
  }

  setOptions(opts: Partial<TimelineOptions>): void {
    if (opts.min !== undefined || opts.max !== undefined || opts.zoomMin !== undefined || opts.zoomMax !== undefined) {
      this.scale.setLimits({
        min: opts.min,
        max: opts.max,
        zoomMin: opts.zoomMin,
        zoomMax: opts.zoomMax,
      });
    }
    if (opts.timeAxis) {
      this.timeAxis.setTimeAxisOptions(opts.timeAxis as { scale: string; step: number });
    }
    if (opts.rowHeight !== undefined) {
      this.options.rowHeight = opts.rowHeight;
    }
    Object.assign(this.options, opts);
    this.renderAll();
  }

  /** vis-timeline compatible event registration */
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    // Wire common events to the callback interface
    if (event === 'click') {
      this.callbacks.onItemClick = (itemId, pointerEvent) => {
        this.emit('click', { item: itemId, event: pointerEvent });
      };
    }
  }

  off(event: string, handler: (...args: any[]) => void): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      for (const h of handlers) h(data);
    }
  }

  // ============================================================================
  // New API (beyond vis-timeline)
  // ============================================================================

  /** Register callback for multi-row ghost creation */
  onMultiRowCreate(handler: (span: MultiRowSpan) => void): void {
    this.callbacks.onMultiRowCreate = handler;
  }

  /** Register onAdd callback (double-click on empty area → single block) */
  onAdd(handler: (item: { group: string; start: Date; end: Date }) => void): void {
    this.callbacks.onAdd = handler;
  }

  /** Register onMove callback (drag/resize completed) */
  onMove(handler: (item: { id: string; group: string; start: Date; end: Date }) => boolean): void {
    this.callbacks.onMove = handler;
  }

  /** Register onMoving callback (live validation during drag) */
  onMoving(
    handler: (item: { id: string; group: string; start: Date; end: Date }) => { start: Date; end: Date } | null,
  ): void {
    this.callbacks.onMoving = handler;
  }

  /** Register callback for click on a day label in the axis header */
  onDayClick(handler: (dayStr: string) => void): void {
    this.timeAxis.onDayClick = handler;
  }

  /** Get the content area element (for external DOM queries like popover anchoring) */
  getContentElement(): HTMLElement {
    return this.layout.getContentArea();
  }

  /**
   * Set daily operating bounds. Overnight gaps are collapsed so each day
   * only shows the operating window (e.g., "07:00" to "21:00").
   */
  setDailyBounds(startTime: string, endTime: string): void {
    this.scale.setDailyBounds(startTime, endTime);
    this.renderAll();
  }

  /** Remove daily bounds — return to continuous 24-hour mode */
  clearDailyBounds(): void {
    this.scale.clearDailyBounds();
    this.renderAll();
  }

  /**
   * Set the explicit list of days to display. In daily-bounds mode, only
   * these days get column space — gap days are fully collapsed.
   */
  setVisibleDays(days: string[]): void {
    this.scale.setVisibleDays(days);
    this.renderAll();
  }

  /** Clear visible days restriction while keeping daily bounds active */
  clearVisibleDays(): void {
    this.scale.clearVisibleDays();
    this.renderAll();
  }

  // ============================================================================
  // Batch Update
  // ============================================================================

  /**
   * Begin a batch update. While batching, renderAll() calls are suppressed.
   * Call endBatchUpdate() when done to trigger a single render.
   */
  beginBatchUpdate(): void {
    this._batchUpdating = true;
  }

  /** End batch update and trigger a single render. */
  endBatchUpdate(): void {
    this._batchUpdating = false;
    this.renderAll();
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  private renderAll(): void {
    if (this._batchUpdating) return;

    this.timeAxis.render();
    this.layout.render();
    this.renderer.render();

    // Render vertical gridlines through content rows
    const contentArea = this.layout.getContentArea();
    const totalHeight = this.layout.getGroupCount() * (this.options.rowHeight ?? 40);
    this.timeAxis.renderGridlines(contentArea, totalHeight);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.interaction.detach();
    this.resizeObserver?.disconnect();
    this.timeAxis.destroy();
    this.layout.destroy();
    this.renderer.destroy();
    this.rootEl.remove();
    this.eventListeners.clear();
  }
}
