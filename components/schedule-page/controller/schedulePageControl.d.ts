import { SchedulePageStore } from '../engine/schedulePageStore';
import { CatalogPlacement, InspectorPlacement, SchedulePageConfig, CatalogMatchUpItem, ScheduleDate, ScheduleIssue, PendingScheduleAction } from '../types';
export declare class SchedulePageControl {
    private readonly store;
    private readonly layout;
    private readonly unsubscribe;
    private container;
    constructor(config: SchedulePageConfig);
    render(container: HTMLElement): void;
    destroy(): void;
    /** Presentation-only changes retain the store and all pending scheduling work. */
    setCatalogPlacement(placement: CatalogPlacement): void;
    setCatalogVisible(visible: boolean): void;
    setInspectorPlacement(placement: InspectorPlacement): void;
    getCatalogRegion(): HTMLElement;
    setMatchUpCatalog(catalog: CatalogMatchUpItem[]): void;
    setScheduleDates(dates: ScheduleDate[]): void;
    setIssues(issues: ScheduleIssue[]): void;
    /** Push several of the above and render once: `control.batch(() => { … })`. */
    batch(writes: () => void): void;
    setActiveStripVisible(visible: boolean): void;
    toggleActiveStrip(): void;
    get activeStripVisible(): boolean;
    setInspectorVisible(visible: boolean): void;
    toggleInspector(): void;
    get inspectorVisible(): boolean;
    save(): PendingScheduleAction[];
    discardPending(): void;
    get hasUnsavedChanges(): boolean;
    getStore(): SchedulePageStore;
}
