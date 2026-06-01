import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { buildStructureMinimap } from '../components/renderStructure/renderStructureMinimap';
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderStructure } from '../components/renderStructure/renderStructure';
import { compositions } from '../compositions/compositions';

const argTypes = {
  drawSize: {
    options: [32, 64, 128],
    control: { type: 'select' }
  },
  quarterCount: {
    options: [4, 8],
    control: { type: 'select' }
  }
};

function buildFrame({ drawSize, quarterCount }: { drawSize: number; quarterCount: number }) {
  const composition = compositions.National;
  const { tournamentRecord, drawIds } = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize, completeAllMatchUps: false }]
  });
  tournamentEngine.setState(tournamentRecord);
  const drawId = drawIds[0];
  const { drawDefinition } = tournamentEngine.getEvent({ drawId });
  const structure = drawDefinition?.structures?.[0];
  const structureId = structure?.structureId;
  const roundMatchUps = (structure as any)?.matchUps
    ? null
    : tournamentEngine.allTournamentMatchUps().matchUps.filter((m: any) => m.drawId === drawId);
  const matchUps = roundMatchUps ?? (structure as any)?.matchUps ?? [];

  const frame = document.createElement('div');
  frame.className = 'chc-draw-frame';
  frame.style.maxWidth = '100%';

  const FRAME_HEIGHT = 600;
  frame.style.height = `${FRAME_HEIGHT}px`;

  const minimap = buildStructureMinimap({ matchUps, quarterCount });
  if (minimap) frame.appendChild(minimap);

  const structureContent = renderStructure({
    context: { drawId, structureId },
    matchUps: matchUps as any,
    composition,
    structureId
  });
  const container = renderContainer({ content: structureContent, theme: composition.theme });
  frame.appendChild(container);

  // Wire scroll → viewport tracker. rAF-throttled to keep it cheap.
  const viewport = minimap?.querySelector('.chc-minimap-viewport') as SVGRectElement | null;
  const round1Count = Number(minimap?.dataset.round1Count ?? 0);
  let pending = false;
  const updateViewport = () => {
    pending = false;
    if (!viewport || !round1Count) return;
    const { scrollTop, clientHeight, scrollHeight } = container;
    if (scrollHeight <= 0) return;
    const yTop = (scrollTop / scrollHeight) * round1Count;
    const yH = Math.max(0.5, (clientHeight / scrollHeight) * round1Count);
    viewport.setAttribute('y', String(yTop));
    viewport.setAttribute('height', String(yH));
  };
  container.addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(updateViewport);
  });
  // Initial sync after layout settles.
  requestAnimationFrame(updateViewport);

  // Wire click → smooth scroll to quarter centre.
  minimap?.addEventListener('click', (e) => {
    const target = (e.target as Element)?.closest?.('[data-quarter]') as SVGElement | null;
    if (!target) return;
    const q = Number(target.dataset.quarter);
    if (Number.isNaN(q)) return;
    const total = Number(minimap.dataset.quarters ?? 4);
    const fraction = (q + 0.5) / total;
    const top = fraction * container.scrollHeight - container.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  });

  return frame;
}

export default {
  title: 'Draws/StructureMinimap',
  tags: ['autodocs'],
  render: ({ drawSize = 128, quarterCount = 4 }: any) => buildFrame({ drawSize, quarterCount }),
  argTypes
};

export const Draw32 = { args: { drawSize: 32, quarterCount: 4 } };
export const Draw64 = { args: { drawSize: 64, quarterCount: 4 } };
export const Draw128 = { args: { drawSize: 128, quarterCount: 4 } };
export const Eighths = { args: { drawSize: 128, quarterCount: 8 } };
