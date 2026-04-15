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
  swapSides?: boolean;
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
export function renderScorecard({ matchUp, composition, eventHandlers, swapSides }: ScorecardOptions): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'chc-scorecard';

  // Team vs team header — when swapSides is true, side 2 renders on the left
  const leftSide = swapSides ? 2 : 1;
  const rightSide = swapSides ? 1 : 2;
  const side1Name = getParticipantName(matchUp, leftSide) || '';
  const side2Name = getParticipantName(matchUp, rightSide) || '';
  const swappedWinningSide = swapSides ? swapWinningSide(matchUp.winningSide) : matchUp.winningSide;
  const swappedSets = swapSides ? swapSetScores(matchUp.score?.sets) : matchUp.score?.sets;
  const header = renderTeamVsHeader({
    side1Name,
    side2Name,
    sets: swappedSets,
    winningSide: swappedWinningSide,
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
      eventHandlers,
      swapSides
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
export function updateTieScore(
  result: any,
  side1Id = 'chc-sc-side1',
  side2Id = 'chc-sc-side2',
  swapSides?: boolean
): void {
  const set = result?.score?.sets?.[0];
  if (!set) return;

  const s1 = document.getElementById(side1Id);
  const s2 = document.getElementById(side2Id);
  if (!s1 || !s2) return;

  s1.classList.remove(winningClass);
  s2.classList.remove(winningClass);

  const leftScoreKey = swapSides ? 'side2Score' : 'side1Score';
  const rightScoreKey = swapSides ? 'side1Score' : 'side2Score';
  s1.textContent = String(set[leftScoreKey] ?? 0);
  s2.textContent = String(set[rightScoreKey] ?? 0);

  const winningSide = swapSides ? swapWinningSide(result.winningSide) : result.winningSide;
  if (winningSide === 1) s1.classList.add(winningClass);
  if (winningSide === 2) s2.classList.add(winningClass);
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
  eventHandlers,
  swapSides
}: {
  collectionDefinition: any;
  collectionMatchUps: any[];
  composition?: any;
  eventHandlers?: any;
  swapSides?: boolean;
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
    const rendered = swapSides ? swapMatchUpSides(tieMatchUp) : tieMatchUp;
    const card = renderMatchUp({
      matchUp: rendered,
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

function swapWinningSide(winningSide?: number): number | undefined {
  if (winningSide === 1) return 2;
  if (winningSide === 2) return 1;
  return undefined;
}

function swapSetScores(sets?: any[]): any[] | undefined {
  if (!sets) return undefined;
  return sets.map((set: any) => ({
    ...set,
    side1Score: set.side2Score,
    side2Score: set.side1Score,
    side1TiebreakScore: set.side2TiebreakScore,
    side2TiebreakScore: set.side1TiebreakScore
  }));
}

function swapMatchUpSides(matchUp: any): any {
  const swappedSides = matchUp.sides?.map((side: any) => ({
    ...side,
    sideNumber: side.sideNumber === 1 ? 2 : 1
  }));
  return {
    ...matchUp,
    sides: swappedSides,
    score: matchUp.score ? { ...matchUp.score, sets: swapSetScores(matchUp.score.sets) } : matchUp.score,
    winningSide: swapWinningSide(matchUp.winningSide)
  };
}

function getParticipantName(matchUp: any, sideNumber: number): string | undefined {
  return matchUp.sides?.find((s: any) => s.sideNumber === sideNumber)?.participant?.participantName;
}
