export interface CourtAvailabilityModalConfig {
    title: string;
    currentDay: string;
    currentStartTime: string;
    currentEndTime: string;
    showScopeToggle?: boolean;
    venueBounds?: {
        startTime: string;
        endTime: string;
    };
    onConfirm: (params: {
        startTime: string;
        endTime: string;
        scope: 'current-day' | 'all-days';
    }) => void;
    onCancel?: () => void;
    /** Custom labels for UI text */
    labels?: {
        startTime?: string;
        endTime?: string;
        applyTo?: string;
        currentDayOnly?: string;
        allDays?: string;
        cancel?: string;
        apply?: string;
        venueWarning?: string;
    };
}
export declare function showCourtAvailabilityModal(config: CourtAvailabilityModalConfig): Promise<void>;
