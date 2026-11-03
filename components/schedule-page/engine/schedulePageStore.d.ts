import { SchedulePageState, SchedulePageChangeListener, SchedulePageConfig, CatalogMatchUpItem, CatalogFilters, ScheduleDate, ScheduleIssue, MatchUpCatalogGroupBy, PendingScheduleAction, SchedulePageDragPayload } from '../types';
export declare class SchedulePageStore {
    private state;
    private readonly listeners;
    private readonly config;
    /** `batch` nesting, and whether a write inside it is waiting to be announced. */
    private batchDepth;
    private emitDeferred;
    constructor(config: SchedulePageConfig);
    getState(): SchedulePageState;
    setMatchUpCatalog(catalog: CatalogMatchUpItem[]): void;
    /**
     * Replace the date strip. Follows the consumer's `isActive` flag onto a new day
     * when it moves, so a consumer that owns date selection stays in sync.
     *
     * Compared against the PREVIOUS active flag rather than against
     * `selectedDate`: a user click through `selectDate` changes the selection
     * without changing what the consumer declared, and re-syncing on every push
     * would yank that click straight back.
     */
    setScheduleDates(dates: ScheduleDate[]): void;
    setIssues(issues: ScheduleIssue[]): void;
    handleMatchUpDrop(payload: SchedulePageDragPayload, event: DragEvent): void;
    handleMatchUpRemove(matchUpId: string): void;
    /**
     * Flush all pending actions via the onBulkSave callback and clear the queue.
     * Returns the actions that were flushed.
     */
    save(): PendingScheduleAction[];
    /**
     * Discard all pending actions without saving.
     */
    discardPending(): void;
    getPendingActions(): PendingScheduleAction[];
    selectDate(date: string): void;
    selectMatchUp(matchUp: CatalogMatchUpItem | null): void;
    setCatalogSearch(query: string): void;
    setCatalogGroupBy(mode: MatchUpCatalogGroupBy): void;
    toggleCatalogGroupCollapsed(groupKey: string): void;
    /** Collapse every group the catalog currently shows, or expand them all. */
    setAllCatalogGroupsCollapsed(collapsed: boolean): void;
    setCatalogFilters(filters: CatalogFilters): void;
    setShowCompleted(show: boolean): void;
    setShowScheduled(show: boolean): void;
    toggleLeftPanel(): void;
    setActiveStripVisible(visible: boolean): void;
    toggleActiveStrip(): void;
    setInspectorVisible(visible: boolean): void;
    toggleInspector(): void;
    subscribe(listener: SchedulePageChangeListener): () => void;
    private setState;
    /**
     * Run several writes and notify listeners once, after the last. A consumer's refresh pushes the
     * catalog, the dates and the issues together; written one by one, each push rebuilt every panel.
     * Nested batches notify when the outermost one ends.
     */
    batch(writes: () => void): void;
    private emit;
}
