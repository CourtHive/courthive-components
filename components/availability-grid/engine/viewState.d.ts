import { availability } from 'tods-competition-factory';
type BlockType = availability.BlockType;
type DayId = availability.DayId;
export interface ViewStateSnapshot {
    selectedDay: DayId | null;
    selectedVenue: string | null;
    selectedCourt: string | null;
    layerVisibility: Map<BlockType, boolean>;
}
export interface ViewChangeEvent {
    type: 'VIEW_CHANGED';
    payload: Partial<ViewStateSnapshot>;
}
export type ViewChangeListener = (event: ViewChangeEvent) => void;
export declare class AvailabilityViewState {
    private selectedDay;
    private selectedVenue;
    private selectedCourt;
    private readonly layerVisibility;
    private readonly listeners;
    setSelectedDay(day: DayId): void;
    getSelectedDay(): DayId | null;
    setSelectedVenue(venueId: string | null): void;
    getSelectedVenue(): string | null;
    setSelectedCourt(courtId: string | null): void;
    getSelectedCourt(): string | null;
    setLayerVisibility(layerId: BlockType, visible: boolean): void;
    getLayerVisibility(): Map<BlockType, boolean>;
    isLayerVisible(layerId: BlockType): boolean;
    getSnapshot(): ViewStateSnapshot;
    subscribe(listener: ViewChangeListener): () => void;
    private emit;
}
export {};
