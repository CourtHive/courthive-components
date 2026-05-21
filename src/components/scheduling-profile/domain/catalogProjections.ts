/**
 * Scheduling Profile — Catalog Projections
 *
 * Transforms round catalog data into filterable, groupable catalog items.
 */

import type {
  CatalogRoundItem,
  CatalogGroupBy,
  PlannedRoundBehavior,
  RoundSegment,
  SchedulingProfile,
  RoundLocator
} from '../types';
import { roundKeyString, pickRoundKey } from './utils';

export function segmentKeyString(roundKey: string, seg: RoundSegment): string {
  return `${roundKey}|${seg.segmentNumber}/${seg.segmentsCount}`;
}

export interface RoundPlacement {
  locator: RoundLocator;
  date: string;
  venueId: string;
  roundSegment?: RoundSegment;
}

/**
 * Build a placement index keyed by `{roundKey}` (whole) and
 * `{roundKey}|{n}/{count}` (segmented). The catalog UI uses this to display
 * the date + venue for any placed round so an operator can locate (and
 * remove) placements without remembering where they were dropped.
 */
export function buildPlacementIndex(profile: SchedulingProfile): Map<string, RoundPlacement[]> {
  const index = new Map<string, RoundPlacement[]>();
  for (const day of profile) {
    for (const v of day.venues) {
      for (let i = 0; i < v.rounds.length; i++) {
        const r = v.rounds[i];
        const rk = roundKeyString(r);
        const seg = r.roundSegment;
        const key = seg ? segmentKeyString(rk, seg) : rk;
        const placement: RoundPlacement = {
          locator: {
            date: day.scheduleDate,
            venueId: v.venueId,
            index: i,
            roundKey: pickRoundKey(r),
            roundSegment: seg
          },
          date: day.scheduleDate,
          venueId: v.venueId,
          roundSegment: seg
        };
        const list = index.get(key);
        if (list) list.push(placement);
        else index.set(key, [placement]);
      }
    }
  }
  return index;
}

/**
 * Max `segmentsCount` per roundKey across all placed segments. Lets the
 * catalog auto-expand a round into sub-rows when segments are already
 * placed — so an orphaned segment is always visible and removable, even if
 * the operator has not manually clicked the split chip.
 */
export function getPlacedSegmentsCount(profile: SchedulingProfile): Map<string, number> {
  const out = new Map<string, number>();
  for (const day of profile) {
    for (const v of day.venues) {
      for (const r of v.rounds) {
        if (!r.roundSegment) continue;
        const rk = roundKeyString(r);
        const cur = out.get(rk) ?? 0;
        if (r.roundSegment.segmentsCount > cur) out.set(rk, r.roundSegment.segmentsCount);
      }
    }
  }
  return out;
}

export function filterCatalog(
  catalog: CatalogRoundItem[],
  query: string,
  plannedKeys: Set<string>,
  behavior: PlannedRoundBehavior = 'dim'
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
      isPlanned: plannedKeys.has(roundKeyString(r))
    }));
}

export function groupCatalog(
  items: Array<CatalogRoundItem & { isPlanned: boolean }>,
  mode: CatalogGroupBy
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

  return new Map([...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })));
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

/**
 * Per-segment planned keys — every placed segment gets a key
 * `{roundKey}|{n}/{count}` so that exploded catalog rows can mark only the
 * specific segment(s) already placed (instead of dimming the whole round).
 * A whole-round placement claims every segment regardless of split count.
 */
export function getPlannedSegmentKeys(profile: {
  venues: { rounds: ({ roundSegment?: { segmentNumber: number; segmentsCount: number } } & Partial<CatalogRoundItem>)[] }[];
}[]): Set<string> {
  const keys = new Set<string>();
  for (const day of profile) {
    for (const v of day.venues) {
      for (const r of v.rounds) {
        if (r.roundSegment) {
          const rk = roundKeyString(r as CatalogRoundItem);
          keys.add(segmentKeyString(rk, r.roundSegment));
        }
      }
    }
  }
  return keys;
}
