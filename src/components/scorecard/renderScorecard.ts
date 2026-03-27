/**
 * Team scorecard renderer.
 * Renders a team matchUp as a structured layout with team vs header,
 * collection panels, and individual matchUp card grids.
 *
 * This is a pure rendering component — no mutations or business logic.
 * Consumers wire interactivity via the eventHandlers callback map.
 */
import { renderMatchUp } from '../renderStructure/renderMatchUp';

export interface ScorecardOptions {
  matchUp: any;
  composition?: any;
  eventHandlers?: any;
}

export interface TeamVsOptions {
  side1Name: string;
  side2Name: string;
  sets?: any[];
  winningSide?: number;
  side1Id?: string;
  side2Id?: string;
}

const winningClass = 'chc-scorecard-side-score--winner';

/**
 * Render a full team scorecard: header + collection panels + matchUp grids.
 */
export function renderScorecard({ matchUp, composition, eventHandlers }: ScorecardOptions): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'chc-scorecard';

  // Team vs team header
  const side1Name = getParticipantName(matchUp, 1) || '';
  const side2Name = getParticipantName(matchUp, 2) || '';
  const header = renderTeamVsHeader({
    side1Name,
    side2Name,
    sets: matchUp.score?.sets,
    winningSide: matchUp.winningSide,
    side1Id: 'chc-sc-side1',
    side2Id: 'chc-sc-side2'
  });
  container.appendChild(header);

  // Collection panels
  const collectionDefinitions =
    matchUp.tieFormat?.collectionDefinitions
      ?.slice()
      .sort((a: any, b: any) => (a.collectionOrder || 0) - (b.collectionOrder || 0)) || [];

  for (const collectionDefinition of collectionDefinitions) {
    const collectionMatchUps = (matchUp.tieMatchUps || [])
      .filter((m: any) => m.collectionId === collectionDefinition.collectionId)
      .sort((a: any, b: any) => (a.collectionPosition || 0) - (b.collectionPosition || 0));

    const panel = renderCollectionPanel({
      collectionDefinition,
      collectionMatchUps,
      composition,
      eventHandlers
    });
    container.appendChild(panel);
  }

  return container;
}

/**
 * Render the team vs team header with names and aggregate score.
 */
export function renderTeamVsHeader({
  side1Name,
  side2Name,
  sets,
  winningSide,
  side1Id,
  side2Id
}: TeamVsOptions): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'chc-scorecard-header';

  const body = document.createElement('div');
  body.className = 'chc-scorecard-header-body';

  const side1 = renderSideElement(side1Name, 'end');
  const side2 = renderSideElement(side2Name, 'start');

  const side1Score = renderSideScore(sets, 1, winningSide, side1Id);
  const side2Score = renderSideScore(sets, 2, winningSide, side2Id);

  const scoreBox = document.createElement('div');
  scoreBox.className = 'chc-scorecard-score-box';
  const scoreFlex = document.createElement('div');
  scoreFlex.className = 'chc-scorecard-score-flex';
  const vs = document.createElement('div');
  vs.className = 'chc-scorecard-vs';
  vs.textContent = 'vs';
  scoreFlex.appendChild(side1Score);
  scoreFlex.appendChild(vs);
  scoreFlex.appendChild(side2Score);
  scoreBox.appendChild(scoreFlex);

  body.appendChild(side1);
  body.appendChild(scoreBox);
  body.appendChild(side2);
  header.appendChild(body);

  return header;
}

/**
 * Update the aggregate tie score in-place (avoids full re-render).
 */
export function updateTieScore(result: any, side1Id = 'chc-sc-side1', side2Id = 'chc-sc-side2'): void {
  const set = result?.score?.sets?.[0];
  if (!set) return;

  const s1 = document.getElementById(side1Id);
  const s2 = document.getElementById(side2Id);
  if (!s1 || !s2) return;

  s1.classList.remove(winningClass);
  s2.classList.remove(winningClass);
  s1.textContent = String(set.side1Score ?? 0);
  s2.textContent = String(set.side2Score ?? 0);

  if (result.winningSide === 1) s1.classList.add(winningClass);
  if (result.winningSide === 2) s2.classList.add(winningClass);
}

// ── Internal helpers ──

function renderSideElement(name: string, justify: 'start' | 'end'): HTMLDivElement {
  const side = document.createElement('div');
  side.className = `chc-scorecard-side chc-scorecard-side--${justify}`;
  const nameEl = document.createElement('div');
  nameEl.className = 'chc-scorecard-side-name';
  nameEl.textContent = name;
  side.appendChild(nameEl);
  return side;
}

function renderSideScore(
  sets: any[] | undefined,
  sideNumber: number,
  winningSide?: number,
  id?: string
): HTMLSpanElement {
  const score = sets?.[0]?.[`side${sideNumber}Score`] ?? 0;
  const el = document.createElement('span');
  el.className = 'chc-scorecard-side-score';
  if (id) el.id = id;
  if (sideNumber === 1) el.style.paddingLeft = '1rem';
  else el.style.paddingRight = '1rem';
  if (sideNumber === winningSide) el.classList.add(winningClass);
  el.textContent = String(score);
  return el;
}

function renderCollectionPanel({
  collectionDefinition,
  collectionMatchUps,
  composition,
  eventHandlers
}: {
  collectionDefinition: any;
  collectionMatchUps: any[];
  composition?: any;
  eventHandlers?: any;
}): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'chc-scorecard-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'chc-scorecard-panel-header';

  const nameEl = document.createElement('div');
  nameEl.className = 'chc-scorecard-panel-name';
  nameEl.textContent = collectionDefinition.collectionName || 'Collection';

  const meta = document.createElement('div');
  meta.className = 'chc-scorecard-panel-meta';

  const mType = (collectionDefinition.matchUpType || '').toUpperCase();
  const typeBadge = document.createElement('span');
  typeBadge.className = `chc-scorecard-type-badge chc-scorecard-type-badge--${
    mType === 'DOUBLES' ? 'doubles' : 'singles'
  }`;
  typeBadge.textContent = mType === 'DOUBLES' ? 'D' : 'S';

  const countBadge = document.createElement('span');
  countBadge.className = 'chc-scorecard-count-badge';
  countBadge.textContent = String(collectionMatchUps.length);

  meta.appendChild(typeBadge);
  meta.appendChild(countBadge);
  header.appendChild(nameEl);
  header.appendChild(meta);
  panel.appendChild(header);

  // MatchUp cards grid
  const grid = document.createElement('div');
  grid.className = 'chc-scorecard-grid';

  for (const tieMatchUp of collectionMatchUps) {
    const card = renderMatchUp({
      matchUp: tieMatchUp,
      isLucky: true,
      eventHandlers,
      composition
    });
    card.classList.add('chc-scorecard-card');
    grid.appendChild(card);
  }

  panel.appendChild(grid);
  return panel;
}

function getParticipantName(matchUp: any, sideNumber: number): string | undefined {
  return matchUp.sides?.find((s: any) => s.sideNumber === sideNumber)?.participant?.participantName;
}
