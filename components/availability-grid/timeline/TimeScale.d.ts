/**
 * TimeScale — Pure math for time↔pixel conversion.
 *
 * No DOM dependency. All methods are deterministic given the current state.
 * State: visibleStart, visibleEnd, containerWidth.
 *
 * Daily bounds mode: When set, overnight gaps (endTime→startTime next day)
 * are collapsed to zero width. Each day only shows the operating window.
 *
 * Visible days: When set (together with daily bounds), only the specified
 * days are shown — gap days between non-contiguous active days are collapsed
 * entirely.
 */
export declare class TimeScale {
    /** Left edge of the visible window */
    private _start;
    /** Right edge of the visible window */
    private _end;
    /** Width of the scrollable content area in pixels */
    private _width;
    /** Hard limits for panning */
    private _min;
    private _max;
    /** Hard limits for zooming (ms) */
    private _zoomMin;
    private _zoomMax;
    /** Daily bounds: minutes since local midnight */
    private _dailyStartMin;
    private _dailyEndMin;
    private _useDailyBounds;
    /**
     * Explicit list of visible day strings ("YYYY-MM-DD"), sorted.
     * When set, only these days get column space in daily-bounds mode.
     * Gap days between non-contiguous entries are fully collapsed.
     */
    private _visibleDays;
    /** Precomputed: midnight timestamps for each visible day, for fast lookup */
    private _visibleDayMs;
    constructor(start: Date, end: Date, width: number);
    get start(): Date;
    get end(): Date;
    get width(): number;
    get duration(): number;
    /** Milliseconds per pixel (uses collapsed duration when daily bounds are set) */
    get msPerPx(): number;
    /** Get the daily bounds config (null if not set) */
    getDailyBounds(): {
        startMin: number;
        endMin: number;
    } | null;
    /** Get the visible days list (null if not set) */
    getVisibleDays(): string[] | null;
    /** Convert a Date to an x-pixel offset from the left edge */
    timeToX(date: Date): number;
    /** Convert an x-pixel offset to a Date */
    xToTime(x: number): Date;
    /** Snap a Date to the nearest N-minute increment */
    snap(date: Date, minutes: number): Date;
    /** Set the visible window */
    setWindow(start: Date, end: Date): void;
    /** Set pan/zoom limits */
    setLimits(opts: {
        min?: Date;
        max?: Date;
        zoomMin?: number;
        zoomMax?: number;
    }): void;
    /** Update container width (e.g. on resize) */
    setWidth(width: number): void;
    /**
     * Set daily operating bounds. When set, overnight gaps are collapsed.
     * @param startTime "HH:MM" — earliest operating hour
     * @param endTime "HH:MM" — latest operating hour
     */
    setDailyBounds(startTime: string, endTime: string): void;
    /** Remove daily bounds — return to continuous 24-hour mode */
    clearDailyBounds(): void;
    /**
     * Set the explicit list of days to show. Only meaningful when daily bounds
     * are active. Gap days between non-contiguous entries are fully collapsed.
     * @param days Sorted array of "YYYY-MM-DD" strings
     */
    setVisibleDays(days: string[]): void;
    /** Clear visible days restriction while keeping daily bounds active */
    clearVisibleDays(): void;
    /** Pan by a pixel delta (positive = scroll right = later times) */
    pan(deltaPixels: number): void;
    /**
     * Zoom by a factor around a center x-pixel.
     * factor < 1 zooms in, factor > 1 zooms out.
     */
    zoom(factor: number, centerX: number): void;
    /**
     * Convert a Date to a "collapsed" position in minutes.
     * Overnight gaps are removed — only operating hours count.
     *
     * When _visibleDays is set, only those specific days get column space.
     * Gap days are fully collapsed (zero width).
     */
    private toCollapsedMin;
    /**
     * Convert a "collapsed" position (in minutes) back to a real Date.
     */
    private fromCollapsedMin;
    private clampBounds;
}
