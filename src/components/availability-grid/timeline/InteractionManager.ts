/**
 * InteractionManager — Pointer event handling with state machine.
 *
 * Uses native PointerEvent API (no Hammer.js). Handles mouse, touch, pen.
 * 3px drag threshold to distinguish clicks from drags.
 *
 * State machine:
 *   IDLE
 *     ├─ pointerdown on item body      → DRAGGING
 *     ├─ pointerdown on left/right edge → RESIZING_LEFT / RESIZING_RIGHT
 *     ├─ dblclick on empty area         → create ghost → GHOST_EDITING
 *     ├─ click on item                  → onItemClick
 *     └─ wheel                          → pan (or zoom if ctrlKey)
 *   DRAGGING
 *     pointermove → update position, snap
 *     pointerup   → commit → IDLE
 *   RESIZING_LEFT / RESIZING_RIGHT
 *     pointermove → adjust start/end
 *     pointerup   → commit → IDLE
 *   GHOST_EDITING
 *     ├─ drag left/right edge → adjust time range
 *     ├─ drag top/bottom edge → expand/contract across rows
 *     ├─ click ghost body     → confirm → onMultiRowCreate → IDLE
 *     └─ Escape               → cancel → clearGhost → IDLE
 */

import { TimeScale } from './TimeScale';
import { RowLayout } from './RowLayout';
import { ItemRenderer } from './ItemRenderer';
import type { InteractionMode, GestureState, TimelineCallbacks, TimelineItemData, MultiRowSpan } from './types';

const DRAG_THRESHOLD = 3; // px
const AUTO_SCROLL_EDGE = 30; // px from edge to trigger auto-scroll
const AUTO_SCROLL_SPEED = 8; // px per frame
const DEFAULT_GHOST_DURATION = 60 * 60 * 1000; // 60 minutes in ms

export class InteractionManager {
  private scale: TimeScale;
  private layout: RowLayout;
  private renderer: ItemRenderer;
  private contentArea: HTMLDivElement;
  private callbacks: TimelineCallbacks;
  private snapMinutes: number;
  private enablePinchZoom: boolean;

  /** Element that receives wheel events (defaults to contentArea, can be overridden) */
  private wheelTarget: HTMLElement;

  private mode: InteractionMode = 'IDLE';
  private gesture: GestureState | null = null;
  private items: TimelineItemData[] = [];

  /** Ghost state for multi-row creation */
  private ghostStartTime: Date | null = null;
  private ghostEndTime: Date | null = null;
  private ghostTopRow: number = 0;
  private ghostBottomRow: number = 0;

  /** Drag guard — suppresses click handler after drag */
  private justDragged = false;

  /** Auto-scroll RAF handle */
  private autoScrollRaf: number | null = null;
  private autoScrollDelta = 0;

  /** Scroll container (the body wrapper that scrolls vertically) */
  private scrollContainer: HTMLElement | null = null;

  constructor(
    scale: TimeScale,
    layout: RowLayout,
    renderer: ItemRenderer,
    callbacks: TimelineCallbacks,
    snapMinutes: number = 5,
    enablePinchZoom: boolean = false
  ) {
    this.scale = scale;
    this.layout = layout;
    this.renderer = renderer;
    this.contentArea = layout.getContentArea();
    this.wheelTarget = this.contentArea;
    this.callbacks = callbacks;
    this.snapMinutes = snapMinutes;
    this.enablePinchZoom = enablePinchZoom;
  }

  // ---- Setup / teardown ----

  setItems(items: TimelineItemData[]): void {
    this.items = items;
  }

  setScrollContainer(el: HTMLElement): void {
    this.scrollContainer = el;
  }

  /** Override the element that receives wheel events (e.g. timeline root instead of content area) */
  setWheelTarget(el: HTMLElement): void {
    this.wheelTarget = el;
  }

  /** Attach event listeners to the content area */
  attach(): void {
    this.contentArea.addEventListener('pointerdown', this.onPointerDown);
    this.contentArea.addEventListener('dblclick', this.onDblClick);
    this.wheelTarget.addEventListener('wheel', this.onWheel, { passive: false });
    document.addEventListener('keydown', this.onKeyDown);
  }

  /** Detach all event listeners */
  detach(): void {
    this.contentArea.removeEventListener('pointerdown', this.onPointerDown);
    this.contentArea.removeEventListener('dblclick', this.onDblClick);
    this.wheelTarget.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    this.stopAutoScroll();
  }

  // ---- State getters ----

  getMode(): InteractionMode {
    return this.mode;
  }

  // ---- Pointer down ----

  private onPointerDown = (e: PointerEvent): void => {
    // Only handle primary button
    if (e.button !== 0) return;

    const { itemId, handle } = ItemRenderer.hitTest(e.target);

    if (this.mode === 'GHOST_EDITING') {
      // Ghost sub-interactions
      if (itemId === '__ghost__' && handle) {
        // Start resizing a ghost edge
        this.startGesture(
          e,
          '__ghost__',
          handle === 'left'
            ? 'RESIZING_LEFT'
            : handle === 'right'
              ? 'RESIZING_RIGHT'
              : handle === 'top'
                ? 'RESIZING_TOP'
                : 'RESIZING_BOTTOM'
        );
        return;
      }
      if (itemId === '__ghost__' && !handle) {
        // Click on ghost body → confirm
        this.confirmGhost();
        return;
      }
      // Click outside ghost → cancel
      this.cancelGhost();
      return;
    }

    if (!itemId) {
      // Pointerdown on empty area — track for potential pan
      return;
    }

    if (handle === 'left') {
      this.startGesture(e, itemId, 'RESIZING_LEFT');
    } else if (handle === 'right') {
      this.startGesture(e, itemId, 'RESIZING_RIGHT');
    } else {
      // Item body — start drag
      const item = this.items.find((i) => i.id === itemId);
      if (!item || item.isSegment || item.type === 'background') return;
      this.startGesture(e, itemId, 'DRAGGING');
    }
  };

  private startGesture(e: PointerEvent, itemId: string, mode: InteractionMode): void {
    e.preventDefault();

    const item = this.items.find((i) => i.id === itemId);
    let originalStart: Date;
    let originalEnd: Date;
    let originalGroup: string;

    if (itemId === '__ghost__') {
      originalStart = this.ghostStartTime!;
      originalEnd = this.ghostEndTime!;
      originalGroup = '';
    } else if (item) {
      originalStart = item.start instanceof Date ? item.start : new Date(item.start as string);
      originalEnd = item.end ? (item.end instanceof Date ? item.end : new Date(item.end as string)) : originalStart;
      originalGroup = item.group;
    } else {
      return;
    }

    this.gesture = {
      mode,
      itemId,
      startX: e.clientX,
      startY: e.clientY,
      originalStart,
      originalEnd,
      originalGroup,
      currentX: e.clientX,
      currentY: e.clientY,
      thresholdExceeded: false
    };

    this.mode = mode;
    this.contentArea.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  }

  // ---- Pointer move ----

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.gesture) return;

    this.gesture.currentX = e.clientX;
    this.gesture.currentY = e.clientY;

    // Check drag threshold
    if (!this.gesture.thresholdExceeded) {
      const dx = Math.abs(e.clientX - this.gesture.startX);
      const dy = Math.abs(e.clientY - this.gesture.startY);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
      this.gesture.thresholdExceeded = true;
    }

    // Auto-scroll check
    this.checkAutoScroll(e);

    switch (this.mode) {
      case 'DRAGGING':
        this.handleDragMove(e);
        break;
      case 'RESIZING_LEFT':
      case 'RESIZING_RIGHT':
        if (this.gesture.itemId === '__ghost__') {
          this.handleGhostTimeResize(e);
        } else {
          this.handleResizeMove(e);
        }
        break;
      case 'RESIZING_TOP':
      case 'RESIZING_BOTTOM':
        this.handleGhostRowResize(e);
        break;
    }
  };

  // ---- Drag handling ----

  private handleDragMove(e: PointerEvent): void {
    if (!this.gesture || !this.gesture.itemId) return;

    const deltaX = e.clientX - this.gesture.startX;
    const deltaMs = deltaX * this.scale.msPerPx;
    const duration = this.gesture.originalEnd.getTime() - this.gesture.originalStart.getTime();

    let newStart = this.scale.snap(new Date(this.gesture.originalStart.getTime() + deltaMs), this.snapMinutes);
    let newEnd = new Date(newStart.getTime() + duration);

    // Determine target group from pointer Y
    const rect = this.contentArea.getBoundingClientRect();
    const relY = e.clientY - rect.top + this.contentArea.scrollTop;
    const targetGroupId = this.layout.yToGroupId(relY) || this.gesture.originalGroup;

    // Call onMoving for live validation/clamping
    if (this.callbacks.onMoving) {
      const result = this.callbacks.onMoving({
        id: this.gesture.itemId,
        group: targetGroupId,
        start: newStart,
        end: newEnd
      });
      if (result === null) return; // Rejected
      newStart = result.start;
      newEnd = result.end;
    }

    // Update visual position
    const x = this.scale.timeToX(newStart);
    const w = this.scale.timeToX(newEnd) - x;
    const rowIndex = this.layout.groupIdToRowIndex(targetGroupId);
    const y = this.layout.getRowTop(rowIndex >= 0 ? rowIndex : 0);
    this.renderer.updateItemPosition(this.gesture.itemId, x, y, w);

    // Highlight target row
    if (rowIndex >= 0) {
      this.renderer.highlightRows([rowIndex]);
    }
  }

  // ---- Resize handling ----

  private handleResizeMove(e: PointerEvent): void {
    if (!this.gesture || !this.gesture.itemId) return;

    const deltaX = e.clientX - this.gesture.startX;
    const deltaMs = deltaX * this.scale.msPerPx;

    let newStart = this.gesture.originalStart;
    let newEnd = this.gesture.originalEnd;

    if (this.mode === 'RESIZING_LEFT') {
      newStart = this.scale.snap(new Date(this.gesture.originalStart.getTime() + deltaMs), this.snapMinutes);
      if (newStart >= newEnd) newStart = new Date(newEnd.getTime() - this.snapMinutes * 60 * 1000);
    } else {
      newEnd = this.scale.snap(new Date(this.gesture.originalEnd.getTime() + deltaMs), this.snapMinutes);
      if (newEnd <= newStart) newEnd = new Date(newStart.getTime() + this.snapMinutes * 60 * 1000);
    }

    // Call onMoving for live validation
    if (this.callbacks.onMoving) {
      const result = this.callbacks.onMoving({
        id: this.gesture.itemId,
        group: this.gesture.originalGroup,
        start: newStart,
        end: newEnd
      });
      if (result === null) return;
      newStart = result.start;
      newEnd = result.end;
    }

    // Update visual position
    const x = this.scale.timeToX(newStart);
    const w = this.scale.timeToX(newEnd) - x;
    const rowIndex = this.layout.groupIdToRowIndex(this.gesture.originalGroup);
    const y = this.layout.getRowTop(rowIndex >= 0 ? rowIndex : 0);
    this.renderer.updateItemPosition(this.gesture.itemId, x, y, w);
  }

  // ---- Pointer up ----

  private onPointerUp = (e: PointerEvent): void => {
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    this.stopAutoScroll();

    if (!this.gesture) {
      this.mode = 'IDLE';
      return;
    }

    const wasGhost = this.gesture.itemId === '__ghost__';

    if (!this.gesture.thresholdExceeded && !wasGhost) {
      // No drag — treat as click
      if (this.gesture.itemId) {
        this.callbacks.onItemClick?.(this.gesture.itemId, e);
      }
      this.gesture = null;
      this.mode = 'IDLE';
      this.renderer.clearHighlights();
      return;
    }

    if (wasGhost) {
      // Ghost resize complete — stay in GHOST_EDITING
      this.gesture = null;
      this.mode = 'GHOST_EDITING';
      return;
    }

    // Commit drag/resize
    if (this.gesture.itemId && this.gesture.thresholdExceeded) {
      this.justDragged = true;
      setTimeout(() => (this.justDragged = false), 300);

      const deltaX = e.clientX - this.gesture.startX;
      const deltaMs = deltaX * this.scale.msPerPx;
      const duration = this.gesture.originalEnd.getTime() - this.gesture.originalStart.getTime();

      let newStart: Date;
      let newEnd: Date;
      let targetGroup = this.gesture.originalGroup;

      if (this.mode === 'DRAGGING') {
        newStart = this.scale.snap(new Date(this.gesture.originalStart.getTime() + deltaMs), this.snapMinutes);
        newEnd = new Date(newStart.getTime() + duration);

        // Determine target group
        const rect = this.contentArea.getBoundingClientRect();
        const relY = e.clientY - rect.top + this.contentArea.scrollTop;
        targetGroup = this.layout.yToGroupId(relY) || this.gesture.originalGroup;
      } else if (this.mode === 'RESIZING_LEFT') {
        newStart = this.scale.snap(new Date(this.gesture.originalStart.getTime() + deltaMs), this.snapMinutes);
        newEnd = this.gesture.originalEnd;
        if (newStart >= newEnd) newStart = new Date(newEnd.getTime() - this.snapMinutes * 60 * 1000);
      } else {
        newStart = this.gesture.originalStart;
        newEnd = this.scale.snap(new Date(this.gesture.originalEnd.getTime() + deltaMs), this.snapMinutes);
        if (newEnd <= newStart) newEnd = new Date(newStart.getTime() + this.snapMinutes * 60 * 1000);
      }

      const accepted = this.callbacks.onMove?.({
        id: this.gesture.itemId,
        group: targetGroup,
        start: newStart,
        end: newEnd
      });

      if (accepted === false) {
        // Rejected — render will restore original position
      }
    }

    this.gesture = null;
    this.mode = 'IDLE';
    this.renderer.clearHighlights();
  };

  // ---- Double-click → Ghost creation ----

  private onDblClick = (e: MouseEvent): void => {
    if (this.justDragged) return;

    const { itemId } = ItemRenderer.hitTest(e.target);
    if (itemId) return; // Double-clicked on existing item, not empty area

    const rect = this.contentArea.getBoundingClientRect();
    const relX = e.clientX - rect.left + this.contentArea.scrollLeft;
    const relY = e.clientY - rect.top + this.contentArea.scrollTop;

    const clickTime = this.scale.xToTime(relX);
    const snappedStart = this.scale.snap(clickTime, this.snapMinutes);
    const snappedEnd = new Date(snappedStart.getTime() + DEFAULT_GHOST_DURATION);

    const groupId = this.layout.yToGroupId(relY);
    if (!groupId) return;

    const rowIndex = this.layout.groupIdToRowIndex(groupId);
    if (rowIndex < 0) return;

    // Show ghost in single row
    this.ghostStartTime = snappedStart;
    this.ghostEndTime = snappedEnd;
    this.ghostTopRow = rowIndex;
    this.ghostBottomRow = rowIndex;
    this.mode = 'GHOST_EDITING';

    this.renderer.showGhost({
      startTime: snappedStart,
      endTime: snappedEnd,
      topRowIndex: rowIndex,
      bottomRowIndex: rowIndex
    });

    this.renderer.highlightRows([rowIndex]);
  };

  // ---- Ghost resize: time (left/right edges) ----

  private handleGhostTimeResize(e: PointerEvent): void {
    if (!this.gesture) return;

    const rect = this.contentArea.getBoundingClientRect();
    const relX = e.clientX - rect.left + this.contentArea.scrollLeft;
    const pointerTime = this.scale.snap(this.scale.xToTime(relX), this.snapMinutes);

    if (this.mode === 'RESIZING_LEFT') {
      if (pointerTime < this.ghostEndTime!) {
        this.ghostStartTime = pointerTime;
      }
    } else {
      if (pointerTime > this.ghostStartTime!) {
        this.ghostEndTime = pointerTime;
      }
    }

    this.updateGhostDisplay();
  }

  // ---- Ghost resize: rows (top/bottom edges) ----

  private handleGhostRowResize(e: PointerEvent): void {
    if (!this.gesture) return;

    const rect = this.contentArea.getBoundingClientRect();
    const relY = e.clientY - rect.top + this.contentArea.scrollTop;
    const targetRow = Math.floor(relY / this.layout.getRowHeight());
    const clampedRow = Math.max(0, Math.min(this.layout.getGroupCount() - 1, targetRow));

    if (this.mode === 'RESIZING_TOP') {
      if (clampedRow <= this.ghostBottomRow) {
        this.ghostTopRow = clampedRow;
      }
    } else {
      if (clampedRow >= this.ghostTopRow) {
        this.ghostBottomRow = clampedRow;
      }
    }

    this.updateGhostDisplay();
  }

  private updateGhostDisplay(): void {
    this.renderer.showGhost({
      startTime: this.ghostStartTime!,
      endTime: this.ghostEndTime!,
      topRowIndex: this.ghostTopRow,
      bottomRowIndex: this.ghostBottomRow
    });

    // Highlight covered rows
    const indices: number[] = [];
    for (let i = this.ghostTopRow; i <= this.ghostBottomRow; i++) {
      indices.push(i);
    }
    this.renderer.highlightRows(indices);
  }

  // ---- Ghost confirm / cancel ----

  private confirmGhost(): void {
    if (!this.ghostStartTime || !this.ghostEndTime) {
      this.cancelGhost();
      return;
    }

    const groupIds: string[] = [];
    for (let i = this.ghostTopRow; i <= this.ghostBottomRow; i++) {
      const group = this.layout.getGroupAtIndex(i);
      if (group) groupIds.push(group.id);
    }

    if (groupIds.length === 0) {
      this.cancelGhost();
      return;
    }

    const span: MultiRowSpan = {
      groupIds,
      topRowIndex: this.ghostTopRow,
      bottomRowIndex: this.ghostBottomRow,
      startTime: this.ghostStartTime,
      endTime: this.ghostEndTime
    };

    this.renderer.clearGhost();
    this.renderer.clearHighlights();
    this.mode = 'IDLE';

    this.callbacks.onMultiRowCreate?.(span);

    this.ghostStartTime = null;
    this.ghostEndTime = null;
  }

  private cancelGhost(): void {
    this.renderer.clearGhost();
    this.renderer.clearHighlights();
    this.mode = 'IDLE';
    this.ghostStartTime = null;
    this.ghostEndTime = null;
  }

  // ---- Wheel → pan / zoom ----

  private onWheel = (e: WheelEvent): void => {
    if ((e.ctrlKey || e.metaKey) && !this.enablePinchZoom) {
      // Pinch-to-zoom disabled — let the browser handle it
      return;
    }

    e.preventDefault();

    if ((e.ctrlKey || e.metaKey) && this.enablePinchZoom) {
      // Zoom
      const factor = e.deltaY > 0 ? 1.15 : 0.87;
      const rect = this.contentArea.getBoundingClientRect();
      const centerX = e.clientX - rect.left;
      this.scale.zoom(factor, centerX);
    } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal pan
      const delta = e.deltaX || e.deltaY;
      this.scale.pan(delta);
    } else {
      // Vertical scroll — let the scroll container handle it
      if (this.scrollContainer) {
        this.scrollContainer.scrollTop += e.deltaY;
      }
      return; // Don't trigger re-render for vertical scroll
    }

    // Notify parent to re-render (scale changed)
    this.onScaleChanged?.();
  };

  /** Callback set by CourtTimeline to trigger re-render when scale changes */
  onScaleChanged: (() => void) | null = null;

  // ---- Keyboard ----

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.mode === 'GHOST_EDITING') {
      this.cancelGhost();
    }
  };

  // ---- Auto-scroll during drag ----

  private checkAutoScroll(e: PointerEvent): void {
    if (!this.scrollContainer) return;

    const rect = this.scrollContainer.getBoundingClientRect();
    const distFromBottom = rect.bottom - e.clientY;
    const distFromTop = e.clientY - rect.top;

    if (distFromBottom < AUTO_SCROLL_EDGE) {
      this.autoScrollDelta = AUTO_SCROLL_SPEED * (1 - distFromBottom / AUTO_SCROLL_EDGE);
      this.startAutoScroll();
    } else if (distFromTop < AUTO_SCROLL_EDGE) {
      this.autoScrollDelta = -AUTO_SCROLL_SPEED * (1 - distFromTop / AUTO_SCROLL_EDGE);
      this.startAutoScroll();
    } else {
      this.stopAutoScroll();
    }
  }

  private startAutoScroll(): void {
    if (this.autoScrollRaf !== null) return;

    const tick = () => {
      if (!this.scrollContainer) return;
      this.scrollContainer.scrollTop += this.autoScrollDelta;
      this.autoScrollRaf = requestAnimationFrame(tick);
    };
    this.autoScrollRaf = requestAnimationFrame(tick);
  }

  private stopAutoScroll(): void {
    if (this.autoScrollRaf !== null) {
      cancelAnimationFrame(this.autoScrollRaf);
      this.autoScrollRaf = null;
    }
    this.autoScrollDelta = 0;
  }
}
