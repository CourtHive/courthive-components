export interface TimePickerConfig {
    startTime: string;
    endTime?: string;
    dayStartTime?: string;
    dayEndTime?: string;
    minuteIncrement?: number;
    minDuration?: number;
    maxDuration?: number;
    clockType?: '12h' | '24h';
    onConfirm: (startTime: string, endTime: string) => void;
    onCancel: () => void;
}
export declare class ModernTimePicker {
    private readonly container;
    private readonly config;
    private picker;
    private readonly inputElement;
    private selectedStart;
    private selectedEnd;
    constructor(config: TimePickerConfig);
    /**
     * Extract HH:mm time from ISO string or time string using factory utilities
     */
    private extractTimeAsHHMM;
    /**
     * Create a hidden container for the input element
     * The timepicker-ui library will create its own modal UI
     */
    private createUI;
    /**
     * Initialize the timepicker-ui instance
     */
    private initTimePicker;
    /**
     * Show the time picker
     */
    show(): Promise<void>;
    /**
     * Destroy the time picker
     */
    destroy(): void;
}
/**
 * Factory function to create and show a time picker
 */
export declare function showModernTimePicker(config: TimePickerConfig): Promise<ModernTimePicker>;
