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
  'DEAD_RUBBER',
]);

export function isCompletedStatus(status?: string): boolean {
  return !!status && COMPLETED_STATUSES.has(status);
}

export function filterMatchUpCatalog(
  catalog: CatalogMatchUpItem[],
  query: string,
  behavior: ScheduledBehavior = 'dim',
  filters?: CatalogFilters,
  showCompleted = false,
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

export function groupMatchUpCatalog(
  items: CatalogMatchUpItem[],
  mode: MatchUpCatalogGroupBy,
): Map<string, CatalogMatchUpItem[]> {
  const m = new Map<string, CatalogMatchUpItem[]>();

  const keyFn = (it: CatalogMatchUpItem): string => {
    if (mode === 'draw') return `${it.eventName} \u2014 ${it.drawName ?? it.drawId}`;
    if (mode === 'round') return it.roundName ?? `Round ${it.roundNumber}`;
    if (mode === 'structure') return `${it.eventName} \u2014 ${it.structureId}`;
    return it.eventName;
  };

  for (const it of items) {
    const k = keyFn(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }

  return new Map([...m.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}
