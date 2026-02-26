/**
 * Scheduling Profile — Catalog Projections
 *
 * Transforms round catalog data into filterable, groupable catalog items.
 */

import type { CatalogRoundItem, CatalogGroupBy, PlannedRoundBehavior } from '../types';
import { roundKeyString } from './utils';

export function filterCatalog(
  catalog: CatalogRoundItem[],
  query: string,
  plannedKeys: Set<string>,
  behavior: PlannedRoundBehavior = 'dim',
): Array<CatalogRoundItem & { isPlanned: boolean }> {
  const q = query.toLowerCase().trim();

  return catalog
    .filter((r) => {
      if (behavior === 'hide' && plannedKeys.has(roundKeyString(r))) return false;
      if (!q) return true;
      const hay = `${r.eventName} ${r.drawName ?? ''} ${r.roundName ?? ''} ${r.drawId}`.toLowerCase();
      return hay.includes(q);
    })
    .map((r) => ({
      ...r,
      isPlanned: plannedKeys.has(roundKeyString(r)),
    }));
}

export function groupCatalog(
  items: Array<CatalogRoundItem & { isPlanned: boolean }>,
  mode: CatalogGroupBy,
): Map<string, Array<CatalogRoundItem & { isPlanned: boolean }>> {
  const m = new Map<string, Array<CatalogRoundItem & { isPlanned: boolean }>>();
  const keyFn = (it: CatalogRoundItem): string => {
    if (mode === 'draw') return `${it.eventName} \u2014 ${it.drawName ?? it.drawId}`;
    if (mode === 'round') return it.roundName ?? `Round ${it.roundNumber}`;
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

export function getPlannedRoundKeys(profile: { venues: { rounds: { roundSegment?: unknown }[] }[] }[]): Set<string> {
  const keys = new Set<string>();
  for (const day of profile) {
    for (const v of day.venues) {
      for (const r of v.rounds) {
        if (!r.roundSegment) {
          keys.add(roundKeyString(r as CatalogRoundItem));
        }
      }
    }
  }
  return keys;
}
