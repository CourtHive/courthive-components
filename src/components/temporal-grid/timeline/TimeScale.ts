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

export class TimeScale {
  /** Left edge of the visible window */
  private _start: number; // ms since epoch
  /** Right edge of the visible window */
  private _end: number; // ms since epoch
  /** Width of the scrollable content area in pixels */
  private _width: number;

  /** Hard limits for panning */
  private _min: number;
  private _max: number;
  /** Hard limits for zooming (ms) */
  private _zoomMin: number;
  private _zoomMax: number;

  /** Daily bounds: minutes since local midnight */
  private _dailyStartMin = 0;
  private _dailyEndMin = 24 * 60;
  private _useDailyBounds = false;

  /**
   * Explicit list of visible day strings ("YYYY-MM-DD"), sorted.
   * When set, only these days get column space in daily-bounds mode.
   * Gap days between non-contiguous entries are fully collapsed.
   */
  private _visibleDays: string[] | null = null;
  /** Precomputed: midnight timestamps for each visible day, for fast lookup */
  private _visibleDayMs: number[] | null = null;

  constructor(start: Date, end: Date, width: number) {
    this._start = start.getTime();
    this._end = end.getTime();
    this._width = Math.max(width, 1);
    this._min = this._start;
    this._max = this._end;
    this._zoomMin = 15 * 60 * 1000; // 15 minutes
    this._zoomMax = (this._end - this._start) * 2;
  }

  // ---- Getters ----

  get start(): Date {
    return new Date(this._start);
  }
  get end(): Date {
    return new Date(this._end);
  }
  get width(): number {
    return this._width;
  }
  get duration(): number {
    return this._end - this._start;
  }
  /** Milliseconds per pixel (uses collapsed duration when daily bounds are set) */
  get msPerPx(): number {
    if (!this._useDailyBounds) {
      return this.duration / this._width;
    }
    const startPos = this.toCollapsedMin(new Date(this._start));
    const endPos = this.toCollapsedMin(new Date(this._end));
    const collapsedRange = endPos - startPos;
    if (collapsedRange <= 0) return 1;
    return (collapsedRange * 60 * 1000) / this._width;
  }

  /** Get the daily bounds config (null if not set) */
  getDailyBounds(): { startMin: number; endMin: number } | null {
    if (!this._useDailyBounds) return null;
    return { startMin: this._dailyStartMin, endMin: this._dailyEndMin };
  }

  /** Get the visible days list (null if not set) */
  getVisibleDays(): string[] | null {
    return this._visibleDays;
  }

  // ---- Conversion ----

  /** Convert a Date to an x-pixel offset from the left edge */
  timeToX(date: Date): number {
    if (!this._useDailyBounds) {
      const ms = date.getTime() - this._start;
      return (ms / this.duration) * this._width;
    }

    const pos = this.toCollapsedMin(date);
    const startPos = this.toCollapsedMin(new Date(this._start));
    const endPos = this.toCollapsedMin(new Date(this._end));
    const range = endPos - startPos;
    if (range <= 0) return 0;
    return ((pos - startPos) / range) * this._width;
  }

  /** Convert an x-pixel offset to a Date */
  xToTime(x: number): Date {
    if (!this._useDailyBounds) {
      const ms = (x / this._width) * this.duration;
      return new Date(this._start + ms);
    }

    const startPos = this.toCollapsedMin(new Date(this._start));
    const endPos = this.toCollapsedMin(new Date(this._end));
    const range = endPos - startPos;
    if (range <= 0) return new Date(this._start);
    const collapsedMin = startPos + (x / this._width) * range;
    return this.fromCollapsedMin(collapsedMin);
  }

  /** Snap a Date to the nearest N-minute increment */
  snap(date: Date, minutes: number): Date {
    const ms = date.getTime();
    const step = minutes * 60 * 1000;
    return new Date(Math.round(ms / step) * step);
  }

  // ---- Mutations ----

  /** Set the visible window */
  setWindow(start: Date, end: Date): void {
    this._start = start.getTime();
    this._end = end.getTime();
    this.clampBounds();
  }

  /** Set pan/zoom limits */
  setLimits(opts: { min?: Date; max?: Date; zoomMin?: number; zoomMax?: number }): void {
    if (opts.min !== undefined) this._min = opts.min.getTime();
    if (opts.max !== undefined) this._max = opts.max.getTime();
    if (opts.zoomMin !== undefined) this._zoomMin = opts.zoomMin;
    if (opts.zoomMax !== undefined) this._zoomMax = opts.zoomMax;
  }

  /** Update container width (e.g. on resize) */
  setWidth(width: number): void {
    this._width = Math.max(width, 1);
  }

  /**
   * Set daily operating bounds. When set, overnight gaps are collapsed.
   * @param startTime "HH:MM" — earliest operating hour
   * @param endTime "HH:MM" — latest operating hour
   */
  setDailyBounds(startTime: string, endTime: string): void {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    this._dailyStartMin = sh * 60 + sm;
    this._dailyEndMin = eh * 60 + em;
    this._useDailyBounds = true;
  }

  /** Remove daily bounds — return to continuous 24-hour mode */
  clearDailyBounds(): void {
    this._useDailyBounds = false;
    this._dailyStartMin = 0;
    this._dailyEndMin = 24 * 60;
    this._visibleDays = null;
    this._visibleDayMs = null;
  }

  /**
   * Set the explicit list of days to show. Only meaningful when daily bounds
   * are active. Gap days between non-contiguous entries are fully collapsed.
   * @param days Sorted array of "YYYY-MM-DD" strings
   */
  setVisibleDays(days: string[]): void {
    this._visibleDays = days;
    this._visibleDayMs = days.map((d) => {
      const dt = new Date(d + 'T00:00:00');
      return dt.getTime();
    });
  }

  /** Clear visible days restriction while keeping daily bounds active */
  clearVisibleDays(): void {
    this._visibleDays = null;
    this._visibleDayMs = null;
  }

  /** Pan by a pixel delta (positive = scroll right = later times) */
  pan(deltaPixels: number): void {
    // When visible days are set, all days are already on screen — no panning.
    // Navigation is via toolbar/datepicker. Panning corrupts the coordinate
    // system due to round-trip precision loss in toCollapsedMin/fromCollapsedMin.
    if (this._visibleDays) return;

    if (this._useDailyBounds) {
      const startPos = this.toCollapsedMin(new Date(this._start));
      const endPos = this.toCollapsedMin(new Date(this._end));
      const range = endPos - startPos;
      if (range <= 0) return;
      const deltaMins = (deltaPixels / this._width) * range;

      const newStart = this.fromCollapsedMin(startPos + deltaMins);
      const newEnd = this.fromCollapsedMin(endPos + deltaMins);
      this._start = newStart.getTime();
      this._end = newEnd.getTime();
      this.clampBounds();
      return;
    }

    const deltaMs = deltaPixels * this.msPerPx;
    let newStart = this._start + deltaMs;
    let newEnd = this._end + deltaMs;

    // Clamp to bounds
    if (newStart < this._min) {
      const shift = this._min - newStart;
      newStart += shift;
      newEnd += shift;
    }
    if (newEnd > this._max) {
      const shift = newEnd - this._max;
      newStart -= shift;
      newEnd -= shift;
    }

    this._start = newStart;
    this._end = newEnd;
  }

  /**
   * Zoom by a factor around a center x-pixel.
   * factor < 1 zooms in, factor > 1 zooms out.
   */
  zoom(factor: number, centerX: number): void {
    // When visible days are set, all days fit on screen — no zooming.
    if (this._visibleDays) return;

    if (this._useDailyBounds) {
      const startPos = this.toCollapsedMin(new Date(this._start));
      const endPos = this.toCollapsedMin(new Date(this._end));
      const range = endPos - startPos;
      const centerPos = startPos + (centerX / this._width) * range;

      let newRange = range * factor;
      // Clamp to zoom limits (convert ms limits to collapsed minutes)
      const zoomMinMins = this._zoomMin / (60 * 1000);
      const zoomMaxMins = this._zoomMax / (60 * 1000);
      newRange = Math.max(zoomMinMins, Math.min(zoomMaxMins, newRange));

      const ratio = centerX / this._width;
      const newStart = this.fromCollapsedMin(centerPos - newRange * ratio);
      const newEnd = this.fromCollapsedMin(centerPos + newRange * (1 - ratio));
      this._start = newStart.getTime();
      this._end = newEnd.getTime();
      this.clampBounds();
      return;
    }

    const centerMs = this._start + (centerX / this._width) * this.duration;
    let newDuration = this.duration * factor;

    // Clamp to zoom limits
    newDuration = Math.max(this._zoomMin, Math.min(this._zoomMax, newDuration));

    // Distribute around center point proportionally
    const ratio = centerX / this._width;
    this._start = centerMs - newDuration * ratio;
    this._end = centerMs + newDuration * (1 - ratio);

    this.clampBounds();
  }

  // ---- Daily bounds: collapsed coordinate system ----

  /**
   * Convert a Date to a "collapsed" position in minutes.
   * Overnight gaps are removed — only operating hours count.
   *
   * When _visibleDays is set, only those specific days get column space.
   * Gap days are fully collapsed (zero width).
   */
  private toCollapsedMin(date: Date): number {
    const visibleMinPerDay = this._dailyEndMin - this._dailyStartMin;
    if (visibleMinPerDay <= 0) return 0;

    const minutesSinceMidnight = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
    const clampedMinutes = Math.max(this._dailyStartMin, Math.min(this._dailyEndMin, minutesSinceMidnight));
    const offsetInDay = clampedMinutes - this._dailyStartMin;

    if (this._visibleDays && this._visibleDayMs) {
      // Find which visible day this date falls on
      const dateMidnight = new Date(date);
      dateMidnight.setHours(0, 0, 0, 0);
      const dateMs = dateMidnight.getTime();

      // Binary search or linear scan (typically small list)
      let dayIdx = -1;
      for (let i = 0; i < this._visibleDayMs.length; i++) {
        if (this._visibleDayMs[i] === dateMs) {
          dayIdx = i;
          break;
        }
      }

      if (dayIdx === -1) {
        // Date is not a visible day — clamp to nearest visible day
        if (dateMs < this._visibleDayMs[0]) {
          return 0; // Before first visible day
        }
        if (dateMs > this._visibleDayMs[this._visibleDayMs.length - 1]) {
          return this._visibleDayMs.length * visibleMinPerDay; // After last visible day
        }
        // Between visible days — snap to the end of the preceding visible day
        for (let i = 0; i < this._visibleDayMs.length - 1; i++) {
          if (dateMs > this._visibleDayMs[i] && dateMs < this._visibleDayMs[i + 1]) {
            return (i + 1) * visibleMinPerDay; // End of previous visible day
          }
        }
        return 0;
      }

      return dayIdx * visibleMinPerDay + offsetInDay;
    }

    // Fallback: original calendar-based indexing
    const refMidnight = new Date(this._start);
    refMidnight.setHours(0, 0, 0, 0);

    const dateMidnight = new Date(date);
    dateMidnight.setHours(0, 0, 0, 0);

    const msPerDay = 24 * 60 * 60 * 1000;
    const dayIndex = Math.round((dateMidnight.getTime() - refMidnight.getTime()) / msPerDay);

    return dayIndex * visibleMinPerDay + offsetInDay;
  }

  /**
   * Convert a "collapsed" position (in minutes) back to a real Date.
   */
  private fromCollapsedMin(collapsedMin: number): Date {
    const visibleMinPerDay = this._dailyEndMin - this._dailyStartMin;
    if (visibleMinPerDay <= 0) return new Date(this._start);

    const dayIndex = Math.floor(collapsedMin / visibleMinPerDay);
    const offsetInDay = collapsedMin - dayIndex * visibleMinPerDay;

    if (this._visibleDays && this._visibleDayMs) {
      // Map sequential index back to actual day
      const clampedIdx = Math.max(0, Math.min(dayIndex, this._visibleDayMs.length - 1));
      const result = new Date(this._visibleDayMs[clampedIdx]);
      const totalMinutes = this._dailyStartMin + offsetInDay;
      result.setHours(Math.floor(totalMinutes / 60), Math.round(totalMinutes % 60), 0, 0);
      return result;
    }

    // Fallback: original calendar-based mapping
    const refMidnight = new Date(this._start);
    refMidnight.setHours(0, 0, 0, 0);

    const result = new Date(refMidnight);
    result.setDate(result.getDate() + dayIndex);
    const totalMinutes = this._dailyStartMin + offsetInDay;
    result.setHours(Math.floor(totalMinutes / 60), Math.round(totalMinutes % 60), 0, 0);

    return result;
  }

  // ---- Internal ----

  private clampBounds(): void {
    const dur = this._end - this._start;
    if (this._start < this._min) {
      this._start = this._min;
      this._end = this._min + dur;
    }
    if (this._end > this._max) {
      this._end = this._max;
      this._start = this._max - dur;
    }
    // Final clamp if window exceeds total range
    if (this._start < this._min) this._start = this._min;
    if (this._end > this._max) this._end = this._max;
  }
}
