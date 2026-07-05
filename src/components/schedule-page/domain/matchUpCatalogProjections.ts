/**
 * Schedule Page — MatchUp Catalog Projections
 *
 * Transforms matchUp catalog data into filterable, groupable items.
 * Search matches on participant names (primary), event/draw/round names.
 */

import type { CatalogMatchUpItem, CatalogFilters, MatchUpCatalogGroupBy, ScheduledBehavior } from '../types';
import { matchUpSearchKey } from './utils';

/** MatchUp statuses that indicate the matchUp is finished. */
const COMPLETED_STATUSES = new Set([
  'COMPLETED',
  'RETIRED',
  'WALKOVER',
  'DEFAULTED',
  'DOUBLE_WALKOVER',
  'DOUBLE_DEFAULT',
  'CANCELLED',
  'ABANDONED',
  'DEAD_RUBBER'
]);

export function isCompletedStatus(status?: string): boolean {
  return !!status && COMPLETED_STATUSES.has(status);
}

export function filterMatchUpCatalog(
  catalog: CatalogMatchUpItem[],
  query: string,
  behavior: ScheduledBehavior = 'dim',
  filters?: CatalogFilters,
  showCompleted = false
): CatalogMatchUpItem[] {
  const q = query.toLowerCase().trim();

  return catalog.filter((item) => {
    if (behavior === 'hide' && item.isScheduled) return false;
    if (!showCompleted && isCompletedStatus(item.matchUpStatus)) return false;
    if (filters) {
      if (filters.eventType && item.matchUpType !== filters.eventType) return false;
      if (filters.eventName && item.eventName !== filters.eventName) return false;
      if (filters.drawName && (item.drawName ?? item.drawId) !== filters.drawName) return false;
      if (filters.gender && item.gender !== filters.gender) return false;
      if (filters.roundName && item.roundName !== filters.roundName) return false;
    }
    if (!q) return true;
    return matchUpSearchKey(item).includes(q);
  });
}

/**
 * For each event, returns the lowest `roundNumber` among items that are
 * unscheduled and not completed. Drives the round-emphasis tier on each
 * catalog card — offset 0 means "this round is what should be scheduled
 * next within its event," offset >= 1 deemphasizes future rounds.
 *
 * Computed against the FULL catalog (not the filtered set) by the catalog
 * widget's `update()` so a search / filter that narrows the visible items
 * doesn't shift the priority assignment underneath the operator.
 */
export function computeBaseRoundByEvent(catalog: CatalogMatchUpItem[]): Map<string, number> {
  const base = new Map<string, number>();
  for (const item of catalog) {
    if (item.isScheduled) continue;
    if (isCompletedStatus(item.matchUpStatus)) continue;
    const cur = base.get(item.eventId);
    if (cur === undefined || item.roundNumber < cur) base.set(item.eventId, item.roundNumber);
  }
  return base;
}

// Labels for non-MAIN stages \u2014 used as the structure-label fallback
// when the factory hasn't surfaced an explicit structureName. MAIN +
// undefined intentionally absent: those groups render as just the
// event name (no suffix).
const STAGE_LABEL: Record<string, string> = {
  CONSOLATION: 'Consolation',
  PLAYOFF: 'Playoff',
  QUALIFYING: 'Qualifying',
  ROUND_ROBIN: 'Round Robin',
  PLAY_OFF: 'Playoff',
  Q_PLAYOFF: 'Qualifying Playoff',
  COMPASS: 'Compass',
  VOLUNTARY_CONSOLATION: 'Voluntary Consolation',
};

const TIME_UNSCHEDULED = 'Unscheduled';

function structureLabel(item: CatalogMatchUpItem): string {
  // Factory-surfaced name takes precedence (rarely user-edited, but
  // when set carries the full canonical structure label).
  if (item.structureName && item.structureName.trim()) return item.structureName.trim();
  const stage = item.stage;
  if (!stage || stage === 'MAIN') return '';
  return STAGE_LABEL[stage] ?? stage.charAt(0) + stage.slice(1).toLowerCase().replace(/_/g, ' ');
}

function minTimeInGroup(items: CatalogMatchUpItem[]): string | undefined {
  let earliest: string | undefined;
  for (const item of items) {
    const t = item.scheduledTime;
    if (!t) continue;
    if (earliest === undefined || t.localeCompare(earliest) < 0) earliest = t;
  }
  return earliest;
}

// Readiness tier for a matchUp: how many of its two sides have a participant
// present (2 = fully ready to play, 1 = awaiting a feeder, 0 = TBD v TBD).
// Drives catalog ordering so real matches float above placeholder ones.
function sideReadiness(item: CatalogMatchUpItem): number {
  const present = (item.sides ?? []).filter((s) => !!s.participantId).length;
  return present > 2 ? 2 : present;
}

// A group's readiness is its best matchUp — a group with any fully-ready match
// outranks one that only has partial/TBD matches.
function groupReadiness(items: CatalogMatchUpItem[]): number {
  let best = 0;
  for (const item of items) {
    const r = sideReadiness(item);
    if (r > best) best = r;
    if (best === 2) break;
  }
  return best;
}

// Stable readiness sort within a group: ready matches first, TBD last, otherwise
// preserve the incoming (factory-traversal) order.
function sortItemsByReadiness(items: CatalogMatchUpItem[]): CatalogMatchUpItem[] {
  return items
    .map((item, index) => ({ item, index, readiness: sideReadiness(item) }))
    .sort((a, b) => b.readiness - a.readiness || a.index - b.index)
    .map((entry) => entry.item);
}

export function groupMatchUpCatalog(
  items: CatalogMatchUpItem[],
  mode: MatchUpCatalogGroupBy
): Map<string, CatalogMatchUpItem[]> {
  const m = new Map<string, CatalogMatchUpItem[]>();

  const keyFn = (it: CatalogMatchUpItem): string => {
    if (mode === 'draw') return `${it.eventName} \u2014 ${it.drawName ?? it.drawId}`;
    if (mode === 'round') return it.roundName ?? `Round ${it.roundNumber}`;
    if (mode === 'structure') {
      const suffix = structureLabel(it);
      return suffix ? `${it.eventName} \u2014 ${suffix}` : it.eventName;
    }
    if (mode === 'time') return it.scheduledTime ?? TIME_UNSCHEDULED;
    return it.eventName;
  };

  for (const it of items) {
    const k = keyFn(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }

  // Smart sort, in priority order:
  //   1. Readiness tier — a group with a fully-ready match (both participants
  //      present) floats above one that only has partial/TBD matches, which
  //      float above all-TBD groups. A "Round 5: TBD v TBD" group no longer
  //      sits above "Round 1: real players".
  //   2. Earliest scheduledTime — within a readiness tier, the group whose next
  //      matchUp starts soonest sits higher; unscheduled groups sink.
  //   3. Natural-numeric alpha on the key so "Round 2" precedes "Round 10".
  // Items within each group are readiness-sorted too (ready above TBD).
  return new Map(
    [...m.entries()]
      .map(([key, arr]): [string, CatalogMatchUpItem[]] => [key, sortItemsByReadiness(arr)])
      .sort((a, b) => {
        const ra = groupReadiness(a[1]);
        const rb = groupReadiness(b[1]);
        if (ra !== rb) return rb - ra;
        const at = minTimeInGroup(a[1]);
        const bt = minTimeInGroup(b[1]);
        if (at !== undefined && bt !== undefined && at !== bt) return at.localeCompare(bt);
        if (at !== undefined && bt === undefined) return -1;
        if (at === undefined && bt !== undefined) return 1;
        return a[0].localeCompare(b[0], undefined, { numeric: true });
      }),
  );
}
