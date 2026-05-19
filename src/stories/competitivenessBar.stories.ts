/**
 * Competitiveness Bar Stories.
 */
import { buildCompetitivenessBar } from '../components/competitivenessBar/buildCompetitivenessBar';
import { aggregateCompetitiveness } from '../components/competitivenessBar/aggregateCompetitiveness';
import type { CompetitivenessBuckets } from '../components/competitivenessBar/types';

export default {
  title: 'Charts/Competitiveness Bar'
};

function host(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'max-width:600px; padding:1rem; font-family:sans-serif;';
  return el;
}

function withLabel(label: string, bar: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:1rem;';
  const heading = document.createElement('div');
  heading.textContent = label;
  heading.style.cssText = 'font-size:0.75rem; color:#666; margin-bottom:0.25rem;';
  wrap.appendChild(heading);
  wrap.appendChild(bar);
  return wrap;
}

function bar(initial: CompetitivenessBuckets): HTMLElement {
  const { element, update } = buildCompetitivenessBar();
  update(initial);
  return element;
}

export const Gallery = {
  render: () => {
    const root = host();
    root.appendChild(withLabel('Balanced', bar({ COMPETITIVE: 12, ROUTINE: 9, DECISIVE: 4, WALKOVER: 1 })));
    root.appendChild(withLabel('Mostly competitive', bar({ COMPETITIVE: 22, ROUTINE: 4, DECISIVE: 1, WALKOVER: 0 })));
    root.appendChild(withLabel('Decisive-heavy', bar({ COMPETITIVE: 2, ROUTINE: 3, DECISIVE: 12, WALKOVER: 2 })));
    root.appendChild(withLabel('Single bucket', bar({ COMPETITIVE: 8, ROUTINE: 0, DECISIVE: 0, WALKOVER: 0 })));
    root.appendChild(withLabel('Empty (renders nothing)', bar({ COMPETITIVE: 0, ROUTINE: 0, DECISIVE: 0, WALKOVER: 0 })));
    return root;
  }
};

export const FromMatchUps = {
  render: () => {
    // Demonstrates the aggregator: pass matchUp-like records and get bucket counts.
    const matchUps = [
      { matchUpStatus: 'COMPLETED', competitiveProfile: { competitiveness: 'COMPETITIVE' } },
      { matchUpStatus: 'COMPLETED', competitiveProfile: { competitiveness: 'COMPETITIVE' } },
      { matchUpStatus: 'COMPLETED', competitiveProfile: { competitiveness: 'ROUTINE' } },
      { matchUpStatus: 'COMPLETED', competitiveProfile: { competitiveness: 'DECISIVE' } },
      { matchUpStatus: 'COMPLETED', competitiveProfile: { competitiveness: 'DECISIVE' } },
      { matchUpStatus: 'WALKOVER' },
      { matchUpStatus: 'DEFAULTED' },
      { matchUpStatus: 'TO_BE_PLAYED' } // skipped
    ];
    const root = host();
    const buckets = aggregateCompetitiveness(matchUps);
    root.appendChild(withLabel(`Aggregated from ${matchUps.length} matchUps`, bar(buckets)));
    return root;
  }
};
