import { TimeScale } from './TimeScale';
export declare class TimeAxis {
    private readonly dayEl;
    private readonly hourEl;
    private readonly scale;
    private tickConfig;
    /** Callback fired when a day label is clicked, with the day string (YYYY-MM-DD) */
    onDayClick?: (dayStr: string) => void;
    constructor(scale: TimeScale, timeAxisOpts?: {
        scale: string;
        step: number;
    });
    /** Get the day-label row element */
    getDayElement(): HTMLDivElement;
    /** Get the hour-tick row element */
    getHourElement(): HTMLDivElement;
    /** Update the time axis options (e.g. when switching views) */
    setTimeAxisOptions(opts: {
        scale: string;
        step: number;
    }): void;
    /** Re-render both rows for the current visible window */
    render(): void;
    private renderDayLabels;
    private renderDayLabelsWithBounds;
    private renderHourTicks;
    private renderHourTicksWithBounds;
    /**
     * Get the list of day-start dates visible in the current window,
     * respecting visibleDays if set, otherwise probing calendar days.
     */
    private getVisibleDayDates;
    /**
     * Render vertical gridlines into a target container (e.g. content area).
     * Uses the same tick positions as the hour ticks.
     */
    renderGridlines(container: HTMLDivElement, totalHeight: number): void;
    /** Compute x positions for all visible ticks */
    private computeTickPositions;
    destroy(): void;
}
