import { TimelineGroupData, TimelineItemData, TimelineOptions, MultiRowSpan } from './types';
export declare class CourtTimeline {
    private options;
    private callbacks;
    private scale;
    private timeAxis;
    private layout;
    private renderer;
    private interaction;
    private rootEl;
    private bodyEl;
    private resizeObserver;
    private _batchUpdating;
    private eventListeners;
    constructor(container: HTMLElement, items: TimelineItemData[], groups: TimelineGroupData[], options?: TimelineOptions);
    setGroups(groups: TimelineGroupData[]): void;
    setItems(items: TimelineItemData[]): void;
    setWindow(start: Date, end: Date, _opts?: {
        animation?: boolean;
    }): void;
    setOptions(opts: Partial<TimelineOptions>): void;
    on(event: string, handler: (...args: any[]) => void): void;
    off(event: string, handler: (...args: any[]) => void): void;
    private emit;
    /** Register callback for multi-row ghost creation */
    onMultiRowCreate(handler: (span: MultiRowSpan) => void): void;
    /** Register onAdd callback (double-click on empty area → single block) */
    onAdd(handler: (item: {
        group: string;
        start: Date;
        end: Date;
    }) => void): void;
    /** Register onMove callback (drag/resize completed) */
    onMove(handler: (item: {
        id: string;
        group: string;
        start: Date;
        end: Date;
    }) => boolean): void;
    /** Register onMoving callback (live validation during drag) */
    onMoving(handler: (item: {
        id: string;
        group: string;
        start: Date;
        end: Date;
    }) => {
        start: Date;
        end: Date;
    } | null): void;
    /** Register callback for click on a day label in the axis header */
    onDayClick(handler: (dayStr: string) => void): void;
    /** Get the content area element (for external DOM queries like popover anchoring) */
    getContentElement(): HTMLElement;
    /**
     * Set daily operating bounds. Overnight gaps are collapsed so each day
     * only shows the operating window (e.g., "07:00" to "21:00").
     */
    setDailyBounds(startTime: string, endTime: string): void;
    /** Remove daily bounds — return to continuous 24-hour mode */
    clearDailyBounds(): void;
    /**
     * Set the explicit list of days to display. In daily-bounds mode, only
     * these days get column space — gap days are fully collapsed.
     */
    setVisibleDays(days: string[]): void;
    /** Clear visible days restriction while keeping daily bounds active */
    clearVisibleDays(): void;
    /**
     * Begin a batch update. While batching, renderAll() calls are suppressed.
     * Call endBatchUpdate() when done to trigger a single render.
     */
    beginBatchUpdate(): void;
    /** End batch update and trigger a single render. */
    endBatchUpdate(): void;
    private renderAll;
    destroy(): void;
}
