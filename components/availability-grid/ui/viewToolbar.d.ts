/**
 * View Toolbar — View-mode preset switcher with date picker and action buttons.
 *
 * Provides a date input + Day / 3 Days / Week view buttons + optional action buttons.
 */
type TimeAxisScale = 'millisecond' | 'second' | 'minute' | 'hour' | 'weekday' | 'day' | 'month' | 'year';
export interface ViewPreset {
    label: string;
    days: number;
    timeAxis: {
        scale: TimeAxisScale;
        step: number;
    };
}
export interface ViewToolbarLabels {
    view?: string;
    day1?: string;
    days3?: string;
    week?: string;
    tournament?: string;
    setDefaultAvailability?: string;
    saveToTournament?: string;
}
export interface ViewToolbarResult {
    element: HTMLElement;
    dateInput: HTMLInputElement;
    setActiveView: (viewKey: string) => void;
    setDate: (dateStr: string) => void;
    setSaveEnabled: (enabled: boolean) => void;
}
export declare const VIEW_PRESETS: Record<string, ViewPreset>;
export declare function buildViewToolbar(onViewChange: (viewKey: string) => void, initialView?: string, onDateChange?: (dateStr: string) => void, options?: {
    labels?: ViewToolbarLabels;
    onSetDefaultAvailability?: () => void;
    onSave?: () => void;
}): ViewToolbarResult;
export {};
