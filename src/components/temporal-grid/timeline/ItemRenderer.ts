/**
 * ItemRenderer — Renders segments (backgrounds) and blocks (draggable ranges).
 *
 * All items are absolutely positioned within the content area.
 * Segments get `pointer-events: none`; blocks get resize handles.
 * Also manages the ghost element for multi-row creation.
 */

import { TimeScale } from './TimeScale';
import { RowLayout } from './RowLayout';
import type { TimelineItemData } from './types';

export class ItemRenderer {
  private scale: TimeScale;
  private layout: RowLayout;
  private contentArea: HTMLDivElement;
  private items: TimelineItemData[] = [];

  /** Currently rendered item elements, keyed by item ID */
  private itemElements = new Map<string, HTMLElement>();

  /** Ghost element for multi-row creation */
  private ghostEl: HTMLDivElement | null = null;
  private ghostCountBadge: HTMLDivElement | null = null;

  constructor(scale: TimeScale, layout: RowLayout) {
    this.scale = scale;
    this.layout = layout;
    this.contentArea = layout.getContentArea();
  }

  // ---- Data update ----

  setItems(items: TimelineItemData[]): void {
    this.items = items;
  }

  // ---- Rendering ----

  render(): void {
    // Remove tracked item elements
    for (const el of this.itemElements.values()) {
      el.remove();
    }
    this.itemElements.clear();

    // Safety net: remove any orphaned item elements that escaped tracking
    // (can happen if duplicate IDs caused Map overwrites)
    this.contentArea.querySelectorAll('[data-item-id]').forEach((el) => {
      if ((el as HTMLElement).dataset.itemId !== '__ghost__') el.remove();
    });

    for (const item of this.items) {
      const el = this.renderItem(item);
      if (el) {
        this.contentArea.appendChild(el);
        this.itemElements.set(item.id, el);
      }
    }
  }

  private renderItem(item: TimelineItemData): HTMLElement | null {
    const rowIndex = this.layout.groupIdToRowIndex(item.group);
    if (rowIndex === -1) return null;

    const startDate = item.start instanceof Date ? item.start : new Date(item.start);
    const endDate = item.end ? (item.end instanceof Date ? item.end : new Date(item.end)) : startDate;

    const x = this.scale.timeToX(startDate);
    const w = this.scale.timeToX(endDate) - x;
    const y = this.layout.getRowTop(rowIndex);
    const h = this.layout.getRowHeight();

    if (w < 0.5) return null; // Too small to render

    const el = document.createElement('div');
    el.dataset.itemId = item.id;
    el.title = item.title || item.content;

    if (item.type === 'background' || item.isSegment) {
      // Segment: background item, no interaction
      el.className = `tg-item-background ${item.className || ''}`.trim();
      if (item.style) el.style.cssText = item.style;
      el.style.position = 'absolute';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.pointerEvents = 'none';
    } else {
      // Block: draggable range item
      el.className = `tg-item tg-item-range ${item.className || ''}`.trim();
      if (item.style) el.style.cssText += item.style;
      el.style.position = 'absolute';
      el.style.left = `${x}px`;
      el.style.top = `${y + 2}px`; // 2px top inset
      el.style.width = `${w}px`;
      el.style.height = `${h - 4}px`; // 4px total vertical inset
      el.style.cursor = 'move';

      // Content label
      const label = document.createElement('span');
      label.className = 'tg-item-content';
      label.textContent = item.content;
      el.appendChild(label);

      // Left resize handle
      const leftHandle = document.createElement('div');
      leftHandle.className = 'tg-resize-handle tg-resize-left';
      leftHandle.dataset.handle = 'left';
      el.appendChild(leftHandle);

      // Right resize handle
      const rightHandle = document.createElement('div');
      rightHandle.className = 'tg-resize-handle tg-resize-right';
      rightHandle.dataset.handle = 'right';
      el.appendChild(rightHandle);
    }

    return el;
  }

  // ---- Single item position update (during drag/resize) ----

  updateItemPosition(itemId: string, x: number, y: number, width: number): void {
    const el = this.itemElements.get(itemId);
    if (!el) return;
    el.style.left = `${x}px`;
    el.style.top = `${y + 2}px`;
    el.style.width = `${width}px`;
  }

  // ---- Ghost (multi-row creation) ----

  showGhost(opts: {
    startTime: Date;
    endTime: Date;
    topRowIndex: number;
    bottomRowIndex: number;
  }): void {
    if (!this.ghostEl) {
      this.ghostEl = document.createElement('div');
      this.ghostEl.className = 'tg-ghost';
      this.ghostEl.dataset.itemId = '__ghost__';

      // 4 resize handles
      for (const pos of ['left', 'right', 'top', 'bottom'] as const) {
        const handle = document.createElement('div');
        handle.className = `tg-resize-handle tg-resize-${pos}`;
        handle.dataset.handle = pos;
        this.ghostEl.appendChild(handle);
      }

      // Court count badge
      this.ghostCountBadge = document.createElement('div');
      this.ghostCountBadge.className = 'tg-ghost-count';
      this.ghostEl.appendChild(this.ghostCountBadge);

      this.contentArea.appendChild(this.ghostEl);
    }

    const x = this.scale.timeToX(opts.startTime);
    const w = this.scale.timeToX(opts.endTime) - x;
    const rowH = this.layout.getRowHeight();
    const y = opts.topRowIndex * rowH;
    const h = (opts.bottomRowIndex - opts.topRowIndex + 1) * rowH;
    const courtCount = opts.bottomRowIndex - opts.topRowIndex + 1;

    this.ghostEl.style.left = `${x}px`;
    this.ghostEl.style.top = `${y}px`;
    this.ghostEl.style.width = `${w}px`;
    this.ghostEl.style.height = `${h}px`;
    this.ghostEl.style.display = 'block';

    if (this.ghostCountBadge) {
      this.ghostCountBadge.textContent = `${courtCount} court${courtCount > 1 ? 's' : ''}`;
      this.ghostCountBadge.style.display = courtCount > 1 ? 'flex' : 'none';
    }
  }

  clearGhost(): void {
    if (this.ghostEl) {
      this.ghostEl.remove();
      this.ghostEl = null;
      this.ghostCountBadge = null;
    }
  }

  isGhostVisible(): boolean {
    return this.ghostEl !== null && this.ghostEl.style.display !== 'none';
  }

  // ---- Row highlights ----

  highlightRows(indices: number[]): void {
    this.clearHighlights();
    for (const i of indices) {
      const rows = this.contentArea.querySelectorAll('.tg-row');
      if (rows[i]) {
        rows[i].classList.add('tg-row-highlight');
      }
    }
  }

  clearHighlights(): void {
    this.contentArea.querySelectorAll('.tg-row-highlight').forEach((r) => {
      r.classList.remove('tg-row-highlight');
    });
  }

  // ---- Hit testing ----

  /** Find the item ID at a given DOM element (bubble up from event target) */
  static hitTest(target: EventTarget | null): { itemId: string | null; handle: string | null } {
    if (!(target instanceof HTMLElement)) return { itemId: null, handle: null };

    // Check for resize handle
    const handleEl = target.closest('.tg-resize-handle') as HTMLElement | null;
    const handle = handleEl?.dataset.handle ?? null;

    // Find the item element
    const itemEl = target.closest('[data-item-id]') as HTMLElement | null;
    const itemId = itemEl?.dataset.itemId ?? null;

    return { itemId, handle };
  }

  destroy(): void {
    this.clearGhost();
    this.clearHighlights();
    for (const el of this.itemElements.values()) {
      el.remove();
    }
    this.itemElements.clear();
  }
}
