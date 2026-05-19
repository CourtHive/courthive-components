/**
 * Competitiveness Donut Stories.
 */
import { buildCompetitivenessDonut } from '../components/competitivenessBar/buildCompetitivenessDonut';
import { aggregateCompetitiveness } from '../components/competitivenessBar/aggregateCompetitiveness';
import type { CompetitivenessBuckets } from '../components/competitivenessBar/types';

export default {
  title: 'Charts/Competitiveness Donut'
};

function host(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex; flex-wrap:wrap; gap:1.5rem; padding:1rem; font-family:sans-serif;';
  return el;
}

function tile(label: string, donut: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:0.5rem;';
  wrap.appendChild(donut);
  const heading = document.createElement('div');
  heading.textContent = label;
  heading.style.cssText = 'font-size:0.75rem; color:#666; text-align:center;';
  wrap.appendChild(heading);
  return wrap;
}

function donut(initial: CompetitivenessBuckets): HTMLElement {
  const { element, update } = buildCompetitivenessDonut();
  update(initial);
  return element;
}

export const Gallery = {
  render: () => {
    const root = host();
    root.appendChild(tile('Balanced', donut({ COMPETITIVE: 12, ROUTINE: 9, DECISIVE: 4, WALKOVER: 1 })));
    root.appendChild(tile('Mostly competitive', donut({ COMPETITIVE: 22, ROUTINE: 4, DECISIVE: 1, WALKOVER: 0 })));
    root.appendChild(tile('Decisive-heavy', donut({ COMPETITIVE: 2, ROUTINE: 3, DECISIVE: 12, WALKOVER: 2 })));
    root.appendChild(tile('Routine + walkover', donut({ COMPETITIVE: 0, ROUTINE: 8, DECISIVE: 0, WALKOVER: 3 })));
    root.appendChild(tile('Single bucket (full ring)', donut({ COMPETITIVE: 8, ROUTINE: 0, DECISIVE: 0, WALKOVER: 0 })));
    root.appendChild(tile('Small N', donut({ COMPETITIVE: 1, ROUTINE: 1, DECISIVE: 1, WALKOVER: 0 })));
    root.appendChild(tile('Empty (renders nothing)', donut({ COMPETITIVE: 0, ROUTINE: 0, DECISIVE: 0, WALKOVER: 0 })));
    return root;
  }
};

export const FromMatchUps = {
  render: () => {
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
    root.appendChild(tile(`Aggregated from ${matchUps.length} matchUps`, donut(buckets)));
    return root;
  }
};
