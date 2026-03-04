/**
 * Stats Bar — Horizontal capacity statistics strip.
 *
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

export interface StatsBarLabels {
  totalHours?: string;
  blocked?: string;
  available?: string;
  avgPerCourt?: string;
}

// ============================================================================
// Implementation
// ============================================================================

export function buildStatsBar(labels?: StatsBarLabels): {
  element: HTMLElement;
  update: (stats: StatsBarUpdate) => void;
} {
  const totalLabel = labels?.totalHours ?? 'Total Hours';
  const blockedLabel = labels?.blocked ?? 'Blocked';
  const availLabel = labels?.available ?? 'Available';
  const avgLabel = labels?.avgPerCourt ?? 'Avg Avail/Court';

  const bar = document.createElement('div');
  bar.className = 'tg-stats-bar';

  const makeStat = (label: string) => {
    const span = document.createElement('span');
    span.innerHTML = `${label}: <b>&mdash;</b>`;
    bar.appendChild(span);
    return span;
  };

  const totalEl = makeStat(totalLabel);
  const blockedEl = makeStat(blockedLabel);
  const availEl = makeStat(availLabel);
  const avgEl = makeStat(avgLabel);

  const update = (stats: StatsBarUpdate) => {
    totalEl.innerHTML = `${totalLabel}: <b>${stats.totalHours.toFixed(1)}h</b>`;
    blockedEl.innerHTML = `${blockedLabel}: <b>${stats.blockedHours.toFixed(1)}h</b>`;
    availEl.innerHTML = `${availLabel}: <b>${stats.availableHours.toFixed(1)}h</b>`;
    avgEl.innerHTML = `${avgLabel}: <b>${stats.avgPerCourt.toFixed(1)}h</b>`;
  };

  return { element: bar, update };
}
