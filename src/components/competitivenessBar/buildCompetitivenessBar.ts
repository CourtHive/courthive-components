/**
 * Competitiveness Bar — DOM factory.
 *
 * Returns an element + an `update(buckets)` callback. The element is hidden
 * (display:none) until the first update with `total > 0`. Each non-zero
 * bucket renders as a flex-grow segment whose count appears centered.
 */

import { COMPETITIVENESS_BUCKETS, CompetitivenessBucket, CompetitivenessBuckets } from './types';
import { totalBuckets } from './aggregateCompetitiveness';

import './competitiveness-bar.css';

const LABEL_MAP: Record<CompetitivenessBucket, string> = {
  COMPETITIVE: 'Competitive',
  ROUTINE: 'Routine',
  DECISIVE: 'Decisive',
  WALKOVER: 'Walkover / Defaulted',
};

export interface BuildCompetitivenessBarResult {
  element: HTMLElement;
  update: (buckets: CompetitivenessBuckets) => void;
}

export function buildCompetitivenessBar(): BuildCompetitivenessBarResult {
  const element = document.createElement('div');
  element.className = 'chc-cb';

  const segments: Record<CompetitivenessBucket, HTMLElement> = {} as any;
  for (const bucket of COMPETITIVENESS_BUCKETS) {
    const seg = document.createElement('div');
    seg.className = 'chc-cb__seg';
    seg.dataset.bucket = bucket;
    segments[bucket] = seg;
    element.appendChild(seg);
  }

  const update = (buckets: CompetitivenessBuckets): void => {
    const total = totalBuckets(buckets);
    element.style.display = total > 0 ? 'flex' : 'none';
    if (!total) return;

    for (const bucket of COMPETITIVENESS_BUCKETS) {
      const seg = segments[bucket];
      const count = buckets[bucket];
      if (count === 0) {
        seg.style.flex = '0 0 0';
        seg.style.padding = '0';
        seg.textContent = '';
        seg.removeAttribute('title');
      } else {
        seg.style.flex = `${count} 1 0`;
        seg.style.padding = '0 4px';
        seg.textContent = String(count);
        seg.title = `${LABEL_MAP[bucket]}: ${count}`;
      }
    }
  };

  return { element, update };
}
