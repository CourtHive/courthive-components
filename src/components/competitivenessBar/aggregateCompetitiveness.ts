/**
 * Aggregates a list of matchUp-like records (or Tabulator rows that expose
 * `getData()`) into the 4-bucket competitiveness count. Items lacking a
 * `competitiveProfile.competitiveness` field are skipped except when their
 * `matchUpStatus` indicates a walkover/default, which is bucketed accordingly.
 */

import { COMPETITIVENESS_BUCKETS, CompetitivenessBucket, CompetitivenessBuckets } from './types';

const WALKOVER_STATUSES = new Set(['WALKOVER', 'DOUBLE_WALKOVER', 'DEFAULTED', 'DOUBLE_DEFAULT']);

function emptyBuckets(): CompetitivenessBuckets {
  return { COMPETITIVE: 0, ROUTINE: 0, DECISIVE: 0, WALKOVER: 0 };
}

export function aggregateCompetitiveness(items: any[]): CompetitivenessBuckets {
  const counts = emptyBuckets();
  if (!Array.isArray(items)) return counts;
  for (const row of items) {
    const data = typeof row?.getData === 'function' ? row.getData() : row;
    if (!data) continue;
    if (data.matchUpStatus && WALKOVER_STATUSES.has(data.matchUpStatus)) {
      counts.WALKOVER += 1;
      continue;
    }
    const c = data.competitiveProfile?.competitiveness as CompetitivenessBucket | undefined;
    if (c && c !== 'WALKOVER' && COMPETITIVENESS_BUCKETS.includes(c)) counts[c] += 1;
  }
  return counts;
}

export function totalBuckets(buckets: CompetitivenessBuckets): number {
  return COMPETITIVENESS_BUCKETS.reduce((sum, b) => sum + buckets[b], 0);
}
