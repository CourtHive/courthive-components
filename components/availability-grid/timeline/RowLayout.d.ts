import { TimelineGroupData } from './types';
export declare class RowLayout {
    private groups;
    private rowHeight;
    /** Label panel (left side) */
    private labelPanel;
    /** Content area (right side, scrollable) */
    private contentArea;
    /** Group ID → row index lookup */
    private groupIndex;
    constructor(rowHeight?: number);
    getLabelPanel(): HTMLDivElement;
    getContentArea(): HTMLDivElement;
    getRowHeight(): number;
    getGroups(): TimelineGroupData[];
    getGroupCount(): number;
    /** Get the group at a given index */
    getGroupAtIndex(index: number): TimelineGroupData | undefined;
    /**
     * Convert a y-offset (relative to content area top) to a group ID.
     * Returns null if y is outside all rows.
     */
    yToGroupId(y: number): string | null;
    /** Convert a group ID to its row index (0-based). Returns -1 if not found. */
    groupIdToRowIndex(id: string): number;
    /**
     * Get all group IDs whose rows intersect the vertical range [yStart, yEnd].
     * Used for multi-row ghost creation.
     */
    getRowRange(yStart: number, yEnd: number): string[];
    /** Get the y-offset of a row's top edge */
    getRowTop(index: number): number;
    setGroups(groups: TimelineGroupData[]): void;
    render(): void;
    private renderLabels;
    private renderRows;
    destroy(): void;
}
