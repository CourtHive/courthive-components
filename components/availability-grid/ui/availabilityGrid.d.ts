import { AvailabilityEngine, availability } from 'tods-competition-factory';
import { AvailabilityGridControl, AvailabilityGridControlConfig } from '../controller/availabilityGridControl';
type DayId = availability.DayId;
/**
 * i18n labels for the availability grid component.
 * All fields are optional — English defaults are used when omitted.
 */
export interface AvailabilityGridLabels {
    view?: string;
    day1?: string;
    days3?: string;
    week?: string;
    tournament?: string;
    courtAvailability?: string;
    totalHours?: string;
    blocked?: string;
    available?: string;
    avgPerCourt?: string;
    setDefaultAvailability?: string;
    saveToTournament?: string;
}
export interface AvailabilityGridCallbacks {
    /**
     * Called when dirty state changes (blocks/availability modified vs initial)
     */
    onDirtyChange?: (isDirty: boolean) => void;
}
export interface AvailabilityGridConfig extends Partial<AvailabilityGridControlConfig>, AvailabilityGridCallbacks {
    /**
     * Tournament record (TODS format)
     */
    tournamentRecord: any;
    /**
     * Engine configuration overrides
     */
    engineConfig?: {
        dayStartTime?: string;
        dayEndTime?: string;
        slotMinutes?: number;
    };
    /**
     * Initial selected day
     */
    initialDay?: DayId;
    /**
     * Show facility tree
     */
    showVenueTree?: boolean;
    /**
     * Show capacity indicator
     */
    showCapacity?: boolean;
    /**
     * Show toolbar
     */
    showToolbar?: boolean;
    /**
     * i18n labels
     */
    labels?: AvailabilityGridLabels;
    /**
     * Language code for datepicker localization (e.g. 'en', 'fr', 'de')
     */
    language?: string;
    /**
     * Callback when "Set Default Availability" is clicked
     */
    onSetDefaultAvailability?: () => void;
    /**
     * Callback when "Save to Tournament" is clicked
     */
    onSave?: () => void;
    /**
     * Callback when mutations are applied
     */
    onMutationsApplied?: (mutations: any[]) => void;
}
export declare class AvailabilityGrid {
    private engine;
    private control;
    private config;
    private rootElement;
    private venueTreeElement;
    private calendarElement;
    private capacityElement;
    private statsBarInstance;
    private viewToolbarResult;
    /** Attached a tick after render (the package is loaded on first use); every read is null-guarded. */
    private datepicker;
    private datepickerLifetime;
    private courtVisibilityCustomized;
    private visibleCourts;
    private initialSnapshot;
    private isDirty;
    constructor(config: AvailabilityGridConfig);
    /**
     * Render the component into a container
     */
    render(container: HTMLElement): void;
    /**
     * Destroy the component and cleanup
     */
    destroy(): void;
    private createRootElement;
    private renderToolbar;
    /**
     * Initialize the datepicker on the toolbar date input.
     * Must be called after the toolbar element is in the DOM.
     */
    private initDatepicker;
    private handleDateChange;
    private renderCapacityIndicator;
    private renderVenueTree;
    private renderCalendar;
    /** Serialize current engine state (blocks + availability) for comparison */
    private takeSnapshot;
    /** Compare current state to initial snapshot and update dirty flag */
    private checkDirtyState;
    /** Reset the snapshot (call after a successful save) */
    resetDirtyState(): void;
    private updateStatsBar;
    private updateCapacityStats;
    private updateVenueTree;
    private handleEngineEvent;
    private handleBlockSelected;
    private handleCourtSelected;
    private handleTimeRangeSelected;
    private handleCourtCheckboxChange;
    private handleVenueCheckboxChange;
    private updateVenueCheckboxState;
    /**
     * Get the engine instance
     */
    getEngine(): AvailabilityEngine;
    /**
     * Get the controller instance
     */
    getControl(): AvailabilityGridControl | null;
    /**
     * Set the selected day
     */
    setDay(day: DayId): void;
    /**
     * Refresh the display
     */
    refresh(): void;
}
/**
 * Create and render a availability grid
 */
export declare function createAvailabilityGrid(config: AvailabilityGridConfig, container: HTMLElement): AvailabilityGrid;
export {};
