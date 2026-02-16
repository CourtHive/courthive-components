/**
 * Stats Bar — Horizontal capacity statistics strip.
 *
 * Extracted from VisTimelineBasic.stories.ts.
 * Shows total hours, blocked, available, and avg per court.
 */

// ============================================================================
// Public Types
// ============================================================================

export interface StatsBarUpdate {
  totalHours: number;
  blockedHours: number;
  availableHours: number;
  avgPerCourt: number;
}

// ============================================================================
// Implementation
// ============================================================================

export function buildStatsBar(): {
  element: HTMLElement;
  update: (stats: StatsBarUpdate) => void;
} {
  const bar = document.createElement('div');
  bar.style.cssText =
    'display:flex; align-items:center; gap:20px; padding:6px 16px; border-bottom:1px solid #e0e0e0; background:#f0f4f4; font-family:sans-serif; font-size:13px; color:#666;';

  const makeStat = (label: string) => {
    const span = document.createElement('span');
    span.innerHTML = `${label}: <b style="color:#218D8D">&mdash;</b>`;
    bar.appendChild(span);
    return span;
  };

  const totalEl = makeStat('Total Hours');
  const blockedEl = makeStat('Blocked');
  const availEl = makeStat('Available');
  const avgEl = makeStat('Avg Avail/Court');

  const update = (stats: StatsBarUpdate) => {
    totalEl.innerHTML = `Total Hours: <b style="color:#218D8D">${stats.totalHours.toFixed(1)}h</b>`;
    blockedEl.innerHTML = `Blocked: <b style="color:#218D8D">${stats.blockedHours.toFixed(1)}h</b>`;
    availEl.innerHTML = `Available: <b style="color:#218D8D">${stats.availableHours.toFixed(1)}h</b>`;
    avgEl.innerHTML = `Avg Avail/Court: <b style="color:#218D8D">${stats.avgPerCourt.toFixed(1)}h</b>`;
  };

  return { element: bar, update };
}
