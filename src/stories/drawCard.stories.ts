/**
 * Draw Card Stories
 *
 * Exercises the draw-card primitive across statuses, sizes, and config
 * variations. Story data is hand-crafted (no factory walk needed).
 */
import { buildDrawCard } from '../components/draw-card/buildDrawCard';
import { buildDrawSkeletonCard } from '../components/draw-card/buildSkeletonCard';
import { mapDrawDefinitionToCardData } from '../components/draw-card/mapDraw';
import { buildCompetitivenessBar } from '../components/competitivenessBar/buildCompetitivenessBar';
import type { DrawCardData } from '../components/draw-card/types';

export default {
  title: 'Cards/Draw Card'
};

function gridWrap(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:1rem; padding:1rem;';
  return wrap;
}

// ── Stories ─────────────────────────────────────────────────────────

const READY: DrawCardData = {
  drawId: 'draw-ready',
  drawName: 'Men’s Singles — Main Draw',
  drawType: 'SINGLE_ELIMINATION',
  drawTypeLabel: 'Single Elimination',
  drawSize: 32,
  entryCount: 28,
  matchUpFormat: 'SET3-S:6/TB7',
  flightNumber: 1,
  generated: true,
  matchUpCounts: { total: 31, completed: 0, inProgress: 0, scheduled: 12 },
  status: { kind: 'ready', label: 'Ready' }
};

const IN_PROGRESS: DrawCardData = {
  ...READY,
  drawId: 'draw-inp',
  drawName: 'Women’s Singles — Main Draw',
  drawSize: 64,
  entryCount: 63,
  matchUpCounts: { total: 63, completed: 27, inProgress: 3, scheduled: 8 },
  status: { kind: 'in-progress', label: 'In progress' },
  utrAvg: 11.4,
  wtnAvg: 14.8
};

const COMPLETED: DrawCardData = {
  ...READY,
  drawId: 'draw-done',
  drawName: 'Boys 14U — Consolation',
  drawType: 'FIRST_MATCH_LOSER_CONSOLATION',
  drawTypeLabel: 'First Match Loser Consolation',
  drawSize: 16,
  entryCount: 16,
  matchUpCounts: { total: 15, completed: 15, inProgress: 0, scheduled: 0 },
  status: { kind: 'completed', label: 'Completed' },
  published: true
};

const UNGENERATED: DrawCardData = {
  drawId: 'flight-2',
  drawName: 'Mixed Doubles — Flight 2',
  flightNumber: 2,
  entryCount: 22,
  generated: false,
  status: { kind: 'ungenerated', label: 'Not generated' }
};

const EMBARGOED: DrawCardData = {
  ...IN_PROGRESS,
  drawId: 'draw-emb',
  drawName: 'Girls 16U — Main Draw',
  embargoActive: true,
  published: false
};

export const Gallery = {
  render: () => {
    const wrap = gridWrap();
    for (const data of [READY, IN_PROGRESS, COMPLETED, UNGENERATED, EMBARGOED]) {
      wrap.appendChild(buildDrawCard(data, undefined, { onClick: (d) => console.log('click', d) }));
    }
    return wrap;
  }
};

export const SkeletonLoading = {
  render: () => {
    const wrap = gridWrap();
    for (let i = 0; i < 5; i += 1) wrap.appendChild(buildDrawSkeletonCard());
    return wrap;
  }
};

function buildCompetitivenessViz(): HTMLElement {
  const { element, update } = buildCompetitivenessBar();
  update({ COMPETITIVE: 14, ROUTINE: 9, DECISIVE: 5, WALKOVER: 2 });
  return element;
}

function buildPlaceholderHistogramViz(): HTMLElement {
  // Lightweight CSS-only mock; real consumer would inject `ratingDistributionChart`.
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; align-items:flex-end; gap:2px; height:60px; width:100%;';
  for (const h of [12, 26, 38, 52, 48, 32, 22, 12, 6]) {
    const b = document.createElement('div');
    b.style.cssText = `flex:1 1 0; height:${h}px; background:var(--chc-status-info, #3b82f6); border-radius:1px;`;
    wrap.appendChild(b);
  }
  return wrap;
}

export const WithCompetitiveness = {
  render: () => {
    const wrap = gridWrap();
    for (const data of [READY, IN_PROGRESS, COMPLETED]) {
      wrap.appendChild(
        buildDrawCard(
          { ...data, visualization: buildCompetitivenessViz() },
          { showVisualization: true },
          { onClick: (d) => console.log('click', d) }
        )
      );
    }
    return wrap;
  }
};

export const WithHistogramPlaceholder = {
  render: () => {
    const wrap = gridWrap();
    for (const data of [READY, IN_PROGRESS]) {
      wrap.appendChild(
        buildDrawCard(
          { ...data, visualization: buildPlaceholderHistogramViz() },
          { showVisualization: true },
          { onClick: (d) => console.log('click', d) }
        )
      );
    }
    return wrap;
  }
};

export const FromFactoryShape = {
  render: () => {
    // Simulates what TMX will hand to mapDrawDefinitionToCardData: a real
    // drawDefinition with structures + matchUps. Verifies the mapper.
    const matchUps: any[] = [];
    for (let i = 0; i < 16; i += 1) {
      matchUps.push({
        matchUpId: `m${i}`,
        matchUpStatus: i < 4 ? 'IN_PROGRESS' : 'TO_BE_PLAYED',
        winningSide: i < 3 ? 1 : undefined,
        schedule: i < 8 ? { scheduledTime: '2026-05-20T09:00:00Z' } : undefined
      });
    }
    const drawDefinition = {
      drawId: 'real-shape',
      drawName: 'Synthetic Main Draw',
      drawType: 'SINGLE_ELIMINATION',
      drawSize: 16,
      matchUpFormat: 'SET3-S:6/TB7',
      flightNumber: 1,
      structures: [{ stage: 'MAIN', positionAssignments: new Array(16).fill({}), matchUps }]
    };
    const data = mapDrawDefinitionToCardData(drawDefinition, {
      entryCount: 14,
      utrAvg: 10.2,
      wtnAvg: 13.7,
      eventId: 'evt-1'
    });
    const wrap = gridWrap();
    wrap.appendChild(buildDrawCard(data, undefined, { onClick: (d) => console.log('click', d) }));
    return wrap;
  }
};
