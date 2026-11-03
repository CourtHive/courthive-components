import { TimeScale } from './TimeScale';
import { RowLayout } from './RowLayout';
import { TimelineItemData } from './types';
export declare class ItemRenderer {
    private scale;
    private layout;
    private contentArea;
    private items;
    /** Currently rendered item elements, keyed by item ID */
    private itemElements;
    /** Ghost element for multi-row creation */
    private ghostEl;
    private ghostCountBadge;
    constructor(scale: TimeScale, layout: RowLayout);
    setItems(items: TimelineItemData[]): void;
    render(): void;
    private renderItem;
    updateItemPosition(itemId: string, x: number, y: number, width: number): void;
    showGhost(opts: {
        startTime: Date;
        endTime: Date;
        topRowIndex: number;
        bottomRowIndex: number;
    }): void;
    clearGhost(): void;
    isGhostVisible(): boolean;
    highlightRows(indices: number[]): void;
    clearHighlights(): void;
    /** Find the item ID at a given DOM element (bubble up from event target) */
    static hitTest(target: EventTarget | null): {
        itemId: string | null;
        handle: string | null;
    };
    destroy(): void;
}
