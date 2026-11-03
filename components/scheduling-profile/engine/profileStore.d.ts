import { ProfileStoreState, ProfileChangeListener, SchedulingProfileConfig, SchedulingProfile, RoundLocator, DragPayload, DropTarget, CatalogGroupBy, CatalogRoundItem, FixAction } from '../types';
export declare class ProfileStore {
    private state;
    private readonly listeners;
    private readonly config;
    constructor(config: SchedulingProfileConfig);
    getState(): ProfileStoreState;
    getSchedulingProfile(): SchedulingProfile;
    selectDate(date: string): void;
    selectCard(locator: RoundLocator | null): void;
    setCatalogSearch(query: string): void;
    setCatalogGroupBy(mode: CatalogGroupBy): void;
    navigateToRound(item: CatalogRoundItem): void;
    dropRound(drag: DragPayload, drop: DropTarget): {
        ok: boolean;
        errorMessage?: string;
    };
    removeRound(locator: RoundLocator): void;
    setNotBeforeTime(locator: RoundLocator, time: string | undefined): void;
    applyFixAction(action: FixAction): void;
    subscribe(listener: ProfileChangeListener): () => void;
    private setState;
    private commitProfile;
    private addRejectionNotice;
    private revalidate;
    private emit;
}
