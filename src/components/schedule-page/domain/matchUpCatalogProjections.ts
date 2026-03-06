/**
 * Schedule Page — MatchUp Catalog Projections
 *
 * Transforms matchUp catalog data into filterable, groupable items.
 * Search matches on participant names (primary), event/draw/round names.
 */

import type { CatalogMatchUpItem, MatchUpCatalogGroupBy, ScheduledBehavior } from '../types';
import { matchUpSearchKey } from './utils';

export function filterMatchUpCatalog(
  catalog: CatalogMatchUpItem[],
  query: string,
  behavior: ScheduledBehavior = 'dim',
): CatalogMatchUpItem[] {
  const q = query.toLowerCase().trim();

  return catalog.filter((item) => {
    if (behavior === 'hide' && item.isScheduled) return false;
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
