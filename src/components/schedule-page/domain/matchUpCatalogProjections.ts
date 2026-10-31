/**
 * Schedule Page — MatchUp Catalog Projections
 *
 * Transforms matchUp catalog data into filterable, groupable items.
 * Search matches on participant names (primary), event/draw/round names.
 */

import { matchUpSearchKey } from './utils';

// constants and types
import type {
  CatalogMatchUpItem,
  CatalogFilters,
  MatchUpCatalogGroupBy,
  ScheduledBehavior,
  SchedulePageState
} from '../types';

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
  VOLUNTARY_CONSOLATION: 'Voluntary Consolation'
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
function sideReadiness(item: CatalogMatchUpItem): number {
  const present = (item.sides ?? []).filter((s) => !!s.participantId).length;
  return present > 2 ? 2 : present;
}

/** The consumer's readiness rank; an item without one ranks after any item with one. */
function rankOf(item: CatalogMatchUpItem): number {
  return item.readinessRank ?? Number.POSITIVE_INFINITY;
}

/** Equal infinities compare equal rather than as NaN. */
function ascending(a: number, b: number): number {
  return a === b ? 0 : a - b;
}

// More sides present first, then the consumer's rank.
function compareReadiness(a: CatalogMatchUpItem, b: CatalogMatchUpItem): number {
  return sideReadiness(b) - sideReadiness(a) || ascending(rankOf(a), rankOf(b));
}

// A group is as ready as its readiest matchUp.
function readiestItem(items: CatalogMatchUpItem[]): CatalogMatchUpItem {
  return items.reduce((best, item) => (compareReadiness(item, best) < 0 ? item : best), items[0]);
}

// Stable readiness sort within a group: ready matches first, TBD last, then the
// consumer's rank, otherwise preserve the incoming (factory-traversal) order.
function sortItemsByReadiness(items: CatalogMatchUpItem[]): CatalogMatchUpItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => compareReadiness(a.item, b.item) || a.index - b.index)
    .map((entry) => entry.item);
}

// Qualifying feeds the main draw, which feeds everything else.
function stageRank(stage?: string): number {
  if (stage === 'QUALIFYING') return 0;
  if (!stage || stage === 'MAIN') return 1;
  return 2;
}

// Where a group sits in its draw: its earliest stage, then its earliest round.
function structuralPosition(items: CatalogMatchUpItem[]): [number, number] {
  let stage = Number.POSITIVE_INFINITY;
  let round = Number.POSITIVE_INFINITY;
  for (const item of items) {
    const s = stageRank(item.stage);
    if (s < stage || (s === stage && item.roundNumber < round)) {
      stage = s;
      round = item.roundNumber;
    }
  }
  return [stage, round];
}

type Group = [string, CatalogMatchUpItem[]];
type GroupComparator = (a: Group, b: Group) => number;

/**
 * The order a mode's groups have by construction, or none.
 *
 *   - time:      the clock; "Unscheduled" last.
 *   - round:     stage, then round number. Round labels do not sort ("F" < "QF" < "R16"), so the
 *                label is never the structure.
 *   - structure: each event's structures stay together and run qualifying → main → the rest.
 *                Events themselves have no structural order, so they are placed by their readiest
 *                structure — readiness choosing between things structure leaves unordered.
 *   - event, draw: no structural order between groups.
 */
function structuralComparator(mode: MatchUpCatalogGroupBy, groups: Group[]): GroupComparator {
  if (mode === 'time') {
    return ([ak], [bk]) => {
      if (ak === bk) return 0;
      if (ak === TIME_UNSCHEDULED) return 1;
      if (bk === TIME_UNSCHEDULED) return -1;
      return ak.localeCompare(bk, undefined, { numeric: true });
    };
  }
  if (mode === 'round') {
    return ([, a], [, b]) => {
      const [as, ar] = structuralPosition(a);
      const [bs, br] = structuralPosition(b);
      return ascending(as, bs) || ascending(ar, br);
    };
  }
  if (mode === 'structure') {
    const eventOrder = rankEventsByReadiness(groups);
    return ([, a], [, b]) =>
      ascending(eventOrder.get(a[0].eventId) ?? 0, eventOrder.get(b[0].eventId) ?? 0) ||
      ascending(structuralPosition(a)[0], structuralPosition(b)[0]);
  }
  return () => 0;
}

// Events in readiness order (readiest structure first), then by name: a position per eventId.
function rankEventsByReadiness(groups: Group[]): Map<string, number> {
  const readiest = new Map<string, CatalogMatchUpItem>();
  for (const [, items] of groups) {
    const best = readiestItem(items);
    const current = readiest.get(best.eventId);
    if (!current || compareReadiness(best, current) < 0) readiest.set(best.eventId, best);
  }
  const ordered = [...readiest.values()].sort(
    (a, b) => compareReadiness(a, b) || a.eventName.localeCompare(b.eventName, undefined, { numeric: true })
  );
  return new Map(ordered.map((item, position) => [item.eventId, position]));
}

export function groupMatchUpCatalog(
  items: CatalogMatchUpItem[],
  mode: MatchUpCatalogGroupBy
): Map<string, CatalogMatchUpItem[]> {
  const m = new Map<string, CatalogMatchUpItem[]>();

  const keyFn = (it: CatalogMatchUpItem): string => {
    if (mode === 'draw') return `${it.eventName} — ${it.drawName ?? it.drawId}`;
    if (mode === 'round') return it.roundName ?? `Round ${it.roundNumber}`;
    if (mode === 'structure') {
      const suffix = structureLabel(it);
      return suffix ? `${it.eventName} — ${suffix}` : it.eventName;
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
  //   1. Structure — the order the mode's groups have by construction (see
  //      `structuralComparator`). Readiness never outranks it: Round 1 stays
  //      above Round 2 even when Round 2 is the readier.
  //   2. Readiness — side readiness (a group with a fully-ready match above one
  //      with only partial/TBD matches), then the consumer's `readinessRank`.
  //   3. Earliest scheduledTime — the group whose next matchUp starts soonest
  //      sits higher; unscheduled groups sink.
  //   4. Natural-numeric alpha on the key so "Round 2" precedes "Round 10".
  // Items within each group are readiness-sorted too (ready above TBD).
  const groups = [...m.entries()].map(([key, arr]): Group => [key, sortItemsByReadiness(arr)]);
  const structural = structuralComparator(mode, groups);
  return new Map(
    groups.sort((a, b) => {
      const s = structural(a, b);
      if (s !== 0) return s;
      const r = compareReadiness(readiestItem(a[1]), readiestItem(b[1]));
      if (r !== 0) return r;
      const at = minTimeInGroup(a[1]);
      const bt = minTimeInGroup(b[1]);
      if (at !== undefined && bt !== undefined && at !== bt) return at.localeCompare(bt);
      if (at !== undefined && bt === undefined) return -1;
      if (at === undefined && bt !== undefined) return 1;
      return a[0].localeCompare(b[0], undefined, { numeric: true });
    })
  );
}

/** The state a catalog view is derived from — every field `visibleCatalogGroups` reads. */
type CatalogViewState = Pick<
  SchedulePageState,
  | 'matchUpCatalog'
  | 'catalogSearchQuery'
  | 'catalogFilters'
  | 'showCompleted'
  | 'showScheduled'
  | 'scheduledBehavior'
  | 'catalogGroupBy'
>;

/**
 * The groups the catalog shows for a state, in display order. One derivation for the panel that draws
 * them and the store that collapses them, so "collapse all" collapses exactly what is on screen.
 */
export function visibleCatalogGroups(state: CatalogViewState): Map<string, CatalogMatchUpItem[]> {
  const behavior = state.showScheduled ? state.scheduledBehavior : 'hide';
  const filtered = filterMatchUpCatalog(
    state.matchUpCatalog,
    state.catalogSearchQuery,
    behavior,
    state.catalogFilters,
    state.showCompleted
  );
  return groupMatchUpCatalog(filtered, state.catalogGroupBy);
}

/** True when the catalog shows at least one group and every group it shows is collapsed. */
export function allCatalogGroupsCollapsed(
  state: CatalogViewState & Pick<SchedulePageState, 'catalogCollapsedGroups'>
): boolean {
  const keys = [...visibleCatalogGroups(state).keys()];
  const collapsed = new Set(state.catalogCollapsedGroups ?? []);
  return keys.length > 0 && keys.every((key) => collapsed.has(key));
}
