/**
 * TimeAxis — Renders a two-row axis header: day labels on top, hour ticks below.
 *
 * Uses Intl.DateTimeFormat for locale-aware formatting.
 * Produces two elements:
 *   `<div class="tg-day-axis">` — day labels (.tg-tick-day)
 *   `<div class="tg-hour-axis">` — hour ticks (.tg-tick-hour)
 *
 * When daily bounds are set on the TimeScale, ticks only appear within
 * each day's operating window. In single-day panning mode (no visibleDays),
 * day labels are clamped ("sticky") to the visible viewport.
 */

import { TimeScale } from './TimeScale';

/** Tick configuration derived from time axis scale/step */
interface TickConfig {
  /** 'hour' or 'day' */
  scale: string;
  /** Step count (e.g. 1 = every hour, 2 = every 2 hours) */
  step: number;
  /** Format for hour labels */
  hourFormat: Intl.DateTimeFormat;
  /** Format for day labels */
  dayFormat: Intl.DateTimeFormat;
}

export class TimeAxis {
  private readonly dayEl: HTMLDivElement;
  private readonly hourEl: HTMLDivElement;
  private readonly scale: TimeScale;
  private tickConfig: TickConfig;

  /** Callback fired when a day label is clicked, with the day string (YYYY-MM-DD) */
  onDayClick?: (dayStr: string) => void;

  constructor(scale: TimeScale, timeAxisOpts?: { scale: string; step: number }) {
    this.scale = scale;
    this.tickConfig = buildTickConfig(timeAxisOpts);

    this.dayEl = document.createElement('div');
    this.dayEl.className = 'tg-day-axis';
    this.dayEl.setAttribute('role', 'presentation');

    this.hourEl = document.createElement('div');
    this.hourEl.className = 'tg-hour-axis';
    this.hourEl.setAttribute('role', 'presentation');

    // Day label click → navigate to that day
    this.dayEl.addEventListener('click', (e) => {
      const tick = (e.target as Element).closest?.('.tg-tick-day') as HTMLElement | null;
      const dayStr = tick?.dataset.day;
      if (!dayStr) return;
      if (this.onDayClick) this.onDayClick(dayStr);
    });
  }

  /** Get the day-label row element */
  getDayElement(): HTMLDivElement {
    return this.dayEl;
  }

  /** Get the hour-tick row element */
  getHourElement(): HTMLDivElement {
    return this.hourEl;
  }

  /** Update the time axis options (e.g. when switching views) */
  setTimeAxisOptions(opts: { scale: string; step: number }): void {
    this.tickConfig = buildTickConfig(opts);
  }

  /** Re-render both rows for the current visible window */
  render(): void {
    this.renderDayLabels();
    this.renderHourTicks();
  }

  // ==========================================================================
  // Day Labels (top row)
  // ==========================================================================

  private renderDayLabels(): void {
    this.dayEl.innerHTML = '';

    const { dayFormat } = this.tickConfig;
    const scale = this.tickConfig.scale;
    const dailyBounds = this.scale.getDailyBounds();

    if (dailyBounds && scale === 'hour') {
      this.renderDayLabelsWithBounds(dailyBounds, dayFormat);
      return;
    }

    // Standard rendering (no daily bounds)
    if (scale === 'hour') {
      const startMs = this.scale.start.getTime();
      const endMs = this.scale.end.getTime();
      const dayTimes = getLocalDayBoundaries(startMs, endMs);

      // If no day boundaries fall within the window, show the current day
      if (dayTimes.length === 0) {
        const d = new Date(startMs);
        d.setHours(0, 0, 0, 0);
        const tick = document.createElement('div');
        tick.className = 'tg-tick-day';
        tick.style.left = '0px';
        tick.style.maxWidth = `${this.scale.width}px`;
        tick.dataset.day = localDateStr(d);
        tick.textContent = dayFormat.format(d);
        this.dayEl.appendChild(tick);
        return;
      }

      for (const t of dayTimes) {
        const x = this.scale.timeToX(t);
        const tick = document.createElement('div');
        tick.className = 'tg-tick-day';
        tick.style.left = `${x}px`;
        tick.dataset.day = localDateStr(t);
        tick.textContent = dayFormat.format(t);
        this.dayEl.appendChild(tick);
      }
    } else if (scale === 'day') {
      const startMs = this.scale.start.getTime();
      const endMs = this.scale.end.getTime();
      const weekTimes = getLocalWeekBoundaries(startMs, endMs);
      for (const t of weekTimes) {
        const x = this.scale.timeToX(t);
        const tick = document.createElement('div');
        tick.className = 'tg-tick-day';
        tick.style.left = `${x}px`;
        tick.dataset.day = localDateStr(t);
        tick.textContent = this.tickConfig.dayFormat.format(t);
        this.dayEl.appendChild(tick);
      }
    }
  }

  private renderDayLabelsWithBounds(
    bounds: { startMin: number; endMin: number },
    _dayFormat: Intl.DateTimeFormat
  ): void {
    const dayDates = this.getVisibleDayDates(bounds);
    const visibleDays = this.scale.getVisibleDays();
    const visibleDayCount = dayDates.length;
    const pxPerDay = visibleDayCount > 0 ? this.scale.width / visibleDayCount : this.scale.width;

    // Pick compact or full format based on available width
    const dayFormat =
      pxPerDay < 150 ? new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }) : _dayFormat;

    if (visibleDays && visibleDays.length > 0) {
      // Multi-day mode: place each day label at its column's left edge
      for (const d of dayDates) {
        const dayOpStart = new Date(d);
        dayOpStart.setHours(0, 0, 0, 0);
        dayOpStart.setMinutes(bounds.startMin);

        const x = this.scale.timeToX(dayOpStart);
        const tick = document.createElement('div');
        tick.className = 'tg-tick-day';
        tick.style.left = `${x}px`;
        tick.style.maxWidth = `${Math.floor(pxPerDay) - 4}px`;
        tick.dataset.day = localDateStr(d);
        tick.textContent = dayFormat.format(dayOpStart);
        this.dayEl.appendChild(tick);
      }
    } else {
      // Single-day panning mode: sticky day labels
      const width = this.scale.width;
      for (const d of dayDates) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        dayStart.setMinutes(bounds.startMin);

        const nextDayStart = new Date(d);
        nextDayStart.setHours(0, 0, 0, 0);
        nextDayStart.setDate(nextDayStart.getDate() + 1);
        nextDayStart.setMinutes(bounds.startMin);

        const dayStartX = this.scale.timeToX(dayStart);
        const dayEndX = this.scale.timeToX(nextDayStart);

        const clampedLeft = Math.max(dayStartX, 0);
        const clampedRight = Math.min(dayEndX, width);
        const labelWidth = clampedRight - clampedLeft;

        if (labelWidth <= 0) continue;

        const tick = document.createElement('div');
        tick.className = 'tg-tick-day';
        tick.style.left = `${clampedLeft}px`;
        tick.style.maxWidth = `${labelWidth}px`;
        tick.dataset.day = localDateStr(d);
        tick.textContent = dayFormat.format(dayStart);
        this.dayEl.appendChild(tick);
      }
    }
  }

  // ==========================================================================
  // Hour Ticks (bottom row)
  // ==========================================================================

  private renderHourTicks(): void {
    this.hourEl.innerHTML = '';

    const { hourFormat } = this.tickConfig;
    const scale = this.tickConfig.scale;
    const step = this.tickConfig.step;
    const dailyBounds = this.scale.getDailyBounds();

    if (dailyBounds && scale === 'hour') {
      this.renderHourTicksWithBounds(dailyBounds, step, hourFormat);
      return;
    }

    const startMs = this.scale.start.getTime();
    const endMs = this.scale.end.getTime();

    if (scale === 'hour') {
      const daySet = new Set(getLocalDayBoundaries(startMs, endMs).map((t) => t.getTime()));
      const hourTimes = getLocalHourBoundaries(startMs, endMs, step);
      for (const t of hourTimes) {
        if (daySet.has(t.getTime())) continue; // skip midnight — it's in the day row
        const x = this.scale.timeToX(t);
        const tick = document.createElement('div');
        tick.className = 'tg-tick-hour';
        tick.style.left = `${x}px`;
        tick.textContent = hourFormat.format(t);
        this.hourEl.appendChild(tick);
      }
    } else if (scale === 'day') {
      const weekSet = new Set(getLocalWeekBoundaries(startMs, endMs).map((t) => t.getTime()));
      const dayTimes = getLocalDayBoundaries(startMs, endMs);
      for (const t of dayTimes) {
        if (weekSet.has(t.getTime())) continue;
        const x = this.scale.timeToX(t);
        const tick = document.createElement('div');
        tick.className = 'tg-tick-hour';
        tick.style.left = `${x}px`;
        tick.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }).format(t);
        this.hourEl.appendChild(tick);
      }
    }
  }

  private renderHourTicksWithBounds(
    bounds: { startMin: number; endMin: number },
    step: number,
    hourFormat: Intl.DateTimeFormat
  ): void {
    const dayDates = this.getVisibleDayDates(bounds);

    for (const d of dayDates) {
      const dayOpStart = new Date(d);
      dayOpStart.setHours(0, 0, 0, 0);
      dayOpStart.setMinutes(bounds.startMin);

      const dayOpEnd = new Date(d);
      dayOpEnd.setHours(0, 0, 0, 0);
      dayOpEnd.setMinutes(bounds.endMin);

      // Hour ticks within the operating window
      const startHour = Math.ceil(bounds.startMin / 60);
      const h = new Date(d);
      h.setHours(startHour, 0, 0, 0);

      // Align to step
      if (h.getHours() % step !== 0) {
        h.setHours(h.getHours() + (step - (h.getHours() % step)));
      }

      while (h.getTime() <= dayOpEnd.getTime()) {
        // Skip if exactly at operating start (that's a day boundary)
        if (h.getTime() !== dayOpStart.getTime()) {
          const hx = this.scale.timeToX(h);
          const tick = document.createElement('div');
          tick.className = 'tg-tick-hour';
          tick.style.left = `${hx}px`;
          tick.textContent = hourFormat.format(h);
          this.hourEl.appendChild(tick);
        }
        h.setHours(h.getHours() + step);
      }
    }
  }

  // ==========================================================================
  // Shared Helper
  // ==========================================================================

  /**
   * Get the list of day-start dates visible in the current window,
   * respecting visibleDays if set, otherwise probing calendar days.
   */
  private getVisibleDayDates(bounds: { startMin: number; endMin: number }): Date[] {
    const visibleDays = this.scale.getVisibleDays();
    if (visibleDays && visibleDays.length > 0) {
      return visibleDays.map((dayStr) => new Date(dayStr + 'T00:00:00'));
    }

    const startMs = this.scale.start.getTime();
    const endMs = this.scale.end.getTime();
    const dayDates: Date[] = [];
    const probe = new Date(startMs);
    probe.setHours(0, 0, 0, 0);

    while (true) {
      const opEnd = new Date(probe);
      opEnd.setHours(0, 0, 0, 0);
      opEnd.setMinutes(bounds.endMin);
      if (opEnd.getTime() < startMs) {
        probe.setDate(probe.getDate() + 1);
        continue;
      }
      const opStart = new Date(probe);
      opStart.setHours(0, 0, 0, 0);
      opStart.setMinutes(bounds.startMin);
      if (opStart.getTime() > endMs) break;
      dayDates.push(new Date(probe));
      probe.setDate(probe.getDate() + 1);
    }

    return dayDates;
  }

  // ==========================================================================
  // Gridlines (unchanged — renders into content area)
  // ==========================================================================

  /**
   * Render vertical gridlines into a target container (e.g. content area).
   * Uses the same tick positions as the hour ticks.
   */
  renderGridlines(container: HTMLDivElement, totalHeight: number): void {
    container.querySelectorAll('.tg-gridline').forEach((el) => el.remove());

    const positions = this.computeTickPositions();
    for (const { x, isMajor } of positions) {
      const line = document.createElement('div');
      line.className = isMajor ? 'tg-gridline tg-gridline-major' : 'tg-gridline';
      line.style.left = `${x}px`;
      line.style.height = `${totalHeight}px`;
      container.appendChild(line);
    }
  }

  /** Compute x positions for all visible ticks */
  private computeTickPositions(): Array<{ x: number; isMajor: boolean }> {
    const positions: Array<{ x: number; isMajor: boolean }> = [];
    const scale = this.tickConfig.scale;
    const step = this.tickConfig.step;
    const dailyBounds = this.scale.getDailyBounds();

    const startMs = this.scale.start.getTime();
    const endMs = this.scale.end.getTime();

    if (dailyBounds && scale === 'hour') {
      const dayDates = this.getVisibleDayDates(dailyBounds);

      for (const d of dayDates) {
        const dayOpStart = new Date(d);
        dayOpStart.setHours(0, 0, 0, 0);
        dayOpStart.setMinutes(dailyBounds.startMin);

        const dayOpEnd = new Date(d);
        dayOpEnd.setHours(0, 0, 0, 0);
        dayOpEnd.setMinutes(dailyBounds.endMin);

        // Major tick at day start
        positions.push({ x: this.scale.timeToX(dayOpStart), isMajor: true });

        // Minor ticks within operating window
        const startHour = Math.ceil(dailyBounds.startMin / 60);
        const h = new Date(d);
        h.setHours(startHour, 0, 0, 0);
        if (h.getHours() % step !== 0) {
          h.setHours(h.getHours() + (step - (h.getHours() % step)));
        }
        while (h.getTime() <= dayOpEnd.getTime()) {
          if (h.getTime() !== dayOpStart.getTime()) {
            positions.push({ x: this.scale.timeToX(h), isMajor: false });
          }
          h.setHours(h.getHours() + step);
        }
      }
    } else if (scale === 'hour') {
      const majorTimes = getLocalDayBoundaries(startMs, endMs);
      const majorSet = new Set(majorTimes.map((t) => t.getTime()));
      for (const t of majorTimes) {
        positions.push({ x: this.scale.timeToX(t), isMajor: true });
      }
      for (const t of getLocalHourBoundaries(startMs, endMs, step)) {
        if (!majorSet.has(t.getTime())) {
          positions.push({ x: this.scale.timeToX(t), isMajor: false });
        }
      }
    } else if (scale === 'day') {
      const majorTimes = getLocalWeekBoundaries(startMs, endMs);
      const majorSet = new Set(majorTimes.map((t) => t.getTime()));
      for (const t of majorTimes) {
        positions.push({ x: this.scale.timeToX(t), isMajor: true });
      }
      for (const t of getLocalDayBoundaries(startMs, endMs)) {
        if (!majorSet.has(t.getTime())) {
          positions.push({ x: this.scale.timeToX(t), isMajor: false });
        }
      }
    }

    return positions;
  }

  destroy(): void {
    this.dayEl.remove();
    this.hourEl.remove();
  }
}

// ============================================================================
// Helpers
// ============================================================================

function buildTickConfig(opts?: { scale: string; step: number }): TickConfig {
  const scale = opts?.scale ?? 'hour';
  const step = opts?.step ?? 1;

  switch (scale) {
    case 'hour':
      return {
        scale,
        step,
        hourFormat: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
        dayFormat: new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
      };
    case 'day':
      return {
        scale,
        step,
        hourFormat: new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }),
        dayFormat: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
      };
    default:
      return {
        scale: 'hour',
        step: 1,
        hourFormat: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
        dayFormat: new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
      };
  }
}

/** Format a Date as local YYYY-MM-DD string */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ============================================================================
// Local-time-aligned boundary generators (used when no daily bounds)
// ============================================================================

/** Get all local midnight boundaries within [startMs, endMs] */
function getLocalDayBoundaries(startMs: number, endMs: number): Date[] {
  const results: Date[] = [];
  const d = new Date(startMs);
  d.setHours(0, 0, 0, 0);
  while (d.getTime() <= endMs) {
    if (d.getTime() >= startMs) {
      results.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return results;
}

/** Get all local hour boundaries within [startMs, endMs], stepping by `step` hours */
function getLocalHourBoundaries(startMs: number, endMs: number, step: number): Date[] {
  const results: Date[] = [];
  const d = new Date(startMs);
  d.setMinutes(0, 0, 0);
  const startHour = d.getHours();
  d.setHours(startHour - (startHour % step));
  while (d.getTime() <= endMs) {
    if (d.getTime() >= startMs) {
      results.push(new Date(d));
    }
    d.setHours(d.getHours() + step);
  }
  return results;
}

/** Get all local Monday-midnight boundaries within [startMs, endMs] */
function getLocalWeekBoundaries(startMs: number, endMs: number): Date[] {
  const results: Date[] = [];
  const d = new Date(startMs);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  while (d.getTime() <= endMs) {
    if (d.getTime() >= startMs) {
      results.push(new Date(d));
    }
    d.setDate(d.getDate() + 7);
  }
  return results;
}
