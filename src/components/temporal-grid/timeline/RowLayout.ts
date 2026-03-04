/**
 * RowLayout — Group rows (swim lanes).
 *
 * One row per court. Fixed label panel on the left, scrollable content area
 * on the right. Provides coordinate ↔ group lookups for interaction handling.
 */

import type { TimelineGroupData } from './types';

export class RowLayout {
  private groups: TimelineGroupData[] = [];
  private rowHeight: number;

  /** Label panel (left side) */
  private labelPanel: HTMLDivElement;
  /** Content area (right side, scrollable) */
  private contentArea: HTMLDivElement;

  /** Group ID → row index lookup */
  private groupIndex = new Map<string, number>();

  constructor(rowHeight: number = 40) {
    this.rowHeight = rowHeight;

    this.labelPanel = document.createElement('div');
    this.labelPanel.className = 'tg-label-panel';
    this.labelPanel.setAttribute('role', 'rowheader');

    this.contentArea = document.createElement('div');
    this.contentArea.className = 'tg-content';
    this.contentArea.setAttribute('role', 'grid');
  }

  // ---- Getters ----

  getLabelPanel(): HTMLDivElement {
    return this.labelPanel;
  }

  getContentArea(): HTMLDivElement {
    return this.contentArea;
  }

  getRowHeight(): number {
    return this.rowHeight;
  }

  getGroups(): TimelineGroupData[] {
    return this.groups;
  }

  getGroupCount(): number {
    return this.groups.length;
  }

  /** Get the group at a given index */
  getGroupAtIndex(index: number): TimelineGroupData | undefined {
    return this.groups[index];
  }

  // ---- Coordinate lookups ----

  /**
   * Convert a y-offset (relative to content area top) to a group ID.
   * Returns null if y is outside all rows.
   */
  yToGroupId(y: number): string | null {
    const index = Math.floor(y / this.rowHeight);
    if (index < 0 || index >= this.groups.length) return null;
    return this.groups[index].id;
  }

  /** Convert a group ID to its row index (0-based). Returns -1 if not found. */
  groupIdToRowIndex(id: string): number {
    return this.groupIndex.get(id) ?? -1;
  }

  /**
   * Get all group IDs whose rows intersect the vertical range [yStart, yEnd].
   * Used for multi-row ghost creation.
   */
  getRowRange(yStart: number, yEnd: number): string[] {
    const top = Math.max(0, Math.floor(Math.min(yStart, yEnd) / this.rowHeight));
    const bottom = Math.min(this.groups.length - 1, Math.floor(Math.max(yStart, yEnd) / this.rowHeight));
    const ids: string[] = [];
    for (let i = top; i <= bottom; i++) {
      ids.push(this.groups[i].id);
    }
    return ids;
  }

  /** Get the y-offset of a row's top edge */
  getRowTop(index: number): number {
    return index * this.rowHeight;
  }

  // ---- Data update ----

  setGroups(groups: TimelineGroupData[]): void {
    // Sort by order property if present, then by content
    this.groups = groups.slice().sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.content.localeCompare(b.content);
    });

    // Rebuild index
    this.groupIndex.clear();
    for (let i = 0; i < this.groups.length; i++) {
      this.groupIndex.set(this.groups[i].id, i);
    }
  }

  // ---- Rendering ----

  render(): void {
    this.renderLabels();
    this.renderRows();
  }

  private renderLabels(): void {
    this.labelPanel.innerHTML = '';
    for (const group of this.groups) {
      const label = document.createElement('div');
      label.className = 'tg-label';
      label.style.height = `${this.rowHeight}px`;
      label.textContent = group.content;
      label.title = group.content;
      label.dataset.groupId = group.id;
      this.labelPanel.appendChild(label);
    }
  }

  private renderRows(): void {
    // Clear only row elements (preserve items which are re-rendered by ItemRenderer)
    const existingRows = this.contentArea.querySelectorAll('.tg-row');
    existingRows.forEach((r) => r.remove());

    for (let i = 0; i < this.groups.length; i++) {
      const row = document.createElement('div');
      row.className = 'tg-row';
      row.style.height = `${this.rowHeight}px`;
      row.style.top = `${i * this.rowHeight}px`;
      row.dataset.groupId = this.groups[i].id;
      this.contentArea.appendChild(row);
    }

    // Set content area total height
    this.contentArea.style.height = `${this.groups.length * this.rowHeight}px`;
  }

  destroy(): void {
    this.labelPanel.remove();
    this.contentArea.remove();
  }
}
