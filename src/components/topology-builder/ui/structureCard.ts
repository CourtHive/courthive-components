/**
 * Structure Card — Card component for topology nodes.
 * Header (stage badge + name + size) + embedded schematic preview + ports.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { renderSchematicStructure } from '../../renderSchematicStructure';
import { generatePreviewMatchUps } from '../domain/previewGenerator';
import { getPlayoffProfiles } from '../domain/playoffProfilesCache';
import type { TopologyNode } from '../types';

const { MAIN, QUALIFYING, CONSOLATION, PLAY_OFF, ROUND_ROBIN, AD_HOC, WINNER, LOSER } = drawDefinitionConstants;

const MIN_CARD_WIDTH = 240;
const ROUND_LAYOUT_WIDTH = 48; // 40px matchup + 4px margin each side
const PREVIEW_PADDING = 16; // 8px left + 8px right

/**
 * Compute the number of schematic rounds for a given draw configuration.
 * For qualifying structures with qualifyingPositions, truncate to only
 * the rounds needed to produce that many qualifiers.
 */
export function getNumRounds(node: TopologyNode): number {
  if (node.structureType === ROUND_ROBIN) {
    const groupSize = node.structureOptions?.groupSize || Math.min(node.drawSize, 4);
    return groupSize - 1;
  }
  if (node.structureType === AD_HOC) {
    return node.structureOptions?.roundsCount || 1;
  }
  const n = Math.max(2, node.drawSize);
  const base = Math.pow(2, Math.floor(Math.log2(n)));
  const feedIn = n - base;
  let numRounds = 0;
  let mc = base / 2;
  while (mc >= 1) {
    numRounds++;
    if (feedIn & mc) numRounds++;
    mc = Math.floor(mc / 2);
  }

  // Truncate qualifying structures to only show rounds needed
  if (node.qualifyingPositions && node.qualifyingPositions > 0 && node.drawSize > node.qualifyingPositions) {
    const maxRounds = Math.round(Math.log2(node.drawSize / node.qualifyingPositions));
    if (maxRounds > 0 && maxRounds < numRounds) {
      numRounds = maxRounds;
    }
  }

  return numRounds;
}

/**
 * Compute the card width needed to fit the schematic preview.
 */
export function getCardWidth(node: TopologyNode): number {
  const numRounds = getNumRounds(node);
  return Math.max(MIN_CARD_WIDTH, numRounds * ROUND_LAYOUT_WIDTH + PREVIEW_PADDING);
}

const BADGE_CLASS: Record<string, string> = {
  [MAIN]: 'tb-card-badge--main',
  [QUALIFYING]: 'tb-card-badge--qualifying',
  [CONSOLATION]: 'tb-card-badge--consolation',
  [PLAY_OFF]: 'tb-card-badge--playoff',
};

export interface RoundAnnotation {
  roundNumber: number;
  linkType: string; // WINNER, LOSER, POSITION
  direction: 'source' | 'target';
  edgeId: string;
  isSelected: boolean;
}

export interface StructureCardCallbacks {
  onSelect: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onDoubleClick?: (nodeId: string) => void;
  onPortMouseDown: (nodeId: string, portType: 'winner' | 'loser') => void;
  onPortMouseUp: (nodeId: string) => void;
  onDragStart: (nodeId: string, startX: number, startY: number) => void;
}

export function buildStructureCard(
  node: TopologyNode,
  callbacks: StructureCardCallbacks,
  isSelected: boolean,
  hasWinnerLink: boolean,
  roundAnnotations?: RoundAnnotation[],
  warnings?: string[],
): HTMLElement {
  const hasWarnings = warnings && warnings.length > 0;
  const card = document.createElement('div');
  card.className = `tb-card${isSelected ? ' tb-card--selected' : ''}${hasWarnings ? ' tb-card--warning' : ''}`;
  card.style.left = `${node.position.x}px`;
  card.style.top = `${node.position.y}px`;
  card.style.minWidth = `${getCardWidth(node)}px`;
  card.setAttribute('data-node-id', node.id);

  // Header
  const header = document.createElement('div');
  header.className = 'tb-card-header';

  const badge = document.createElement('span');
  badge.className = `tb-card-badge ${BADGE_CLASS[node.stage] || 'tb-card-badge--main'}`;
  badge.textContent = node.stage.substring(0, 4);

  const name = document.createElement('span');
  name.className = 'tb-card-name';
  name.textContent = node.structureName;

  const size = document.createElement('span');
  size.className = 'tb-card-size';
  size.textContent = `\u00d7${node.drawSize}`;

  header.appendChild(badge);
  header.appendChild(name);
  header.appendChild(size);

  // Preview
  const preview = document.createElement('div');
  preview.className = 'tb-card-preview';

  const matchUps = node.matchUps || generatePreviewMatchUps({
    structureType: node.structureType,
    drawSize: node.drawSize,
    stage: node.stage,
    structureId: node.id,
    qualifyingPositions: node.qualifyingPositions,
    structureOptions: node.structureOptions,
  });

  if (matchUps.length > 0) {
    try {
      const schematic = renderSchematicStructure({
        matchUps,
        structureId: node.id,
        showHeaders: false,
      });
      schematic.style.transform = 'scale(0.8)';
      schematic.style.transformOrigin = 'top left';
      preview.appendChild(schematic);
    } catch {
      preview.textContent = `${node.structureType} \u00d7${node.drawSize}`;
      preview.style.cssText += 'font-size:11px;color:var(--chc-text-muted);display:flex;align-items:center;justify-content:center;';
    }
  }

  // Apply round annotations — color matchup boxes in linked rounds
  if (roundAnnotations?.length && preview.querySelector('.chc-schematic-structure')) {
    const roundContainers = preview.querySelectorAll<HTMLElement>('.chc-schematic-round-container[data-round-number]');
    for (const container of roundContainers) {
      const rn = parseInt(container.getAttribute('data-round-number') || '0');
      const annotations = roundAnnotations.filter((a) => a.roundNumber === rn);
      if (!annotations.length) continue;

      // Apply CSS class to color the matchup slots in this round
      // Prefer selected annotation, then pick by priority: loser > winner > position
      const selected = annotations.find((a) => a.isSelected);
      const primary = selected || annotations.find((a) => a.linkType === LOSER)
        || annotations.find((a) => a.linkType === WINNER) || annotations[0];

      container.classList.add('tb-round-linked');
      container.classList.add(`tb-round-linked--${primary.linkType.toLowerCase()}`);
      container.classList.add(`tb-round-linked--${primary.direction}`);
      if (primary.isSelected) container.classList.add('tb-round-linked--active');

      // Make the round clickable to select the edge
      container.style.cursor = 'pointer';
      container.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onSelectEdge(primary.edgeId);
      });

      // Tooltip
      container.title = annotations
        .map((a) => `R${rn} ${a.linkType} ${a.direction === 'source' ? 'out' : 'in'}`)
        .join(', ');
    }
  }

  // Rounds info
  const profiles = getPlayoffProfiles(node.structureType, node.drawSize, node.structureOptions?.groupSize);
  let roundsDiv: HTMLElement | null = null;

  if (profiles.playoffRoundsRanges?.length) {
    roundsDiv = document.createElement('div');
    roundsDiv.className = 'tb-card-rounds';
    roundsDiv.textContent = profiles.playoffRoundsRanges
      .map((r) => `R${r.roundNumber}:${r.finishingPositionRange}`)
      .join(' ');
  } else if (profiles.playoffFinishingPositionRanges?.length) {
    roundsDiv = document.createElement('div');
    roundsDiv.className = 'tb-card-rounds';
    roundsDiv.textContent = profiles.playoffFinishingPositionRanges
      .map((p) => `P${p.finishingPosition}:${p.finishingPositionRange}`)
      .join(' ');
  }

  // Ports
  const ports = document.createElement('div');
  ports.className = 'tb-card-ports';

  const inputPort = document.createElement('div');
  inputPort.className = 'tb-port tb-port--input';
  inputPort.title = 'Input';
  inputPort.addEventListener('mouseup', (e) => {
    e.stopPropagation();
    callbacks.onPortMouseUp(node.id);
  });

  const outputGroup = document.createElement('div');
  outputGroup.className = 'tb-port-group';

  const winnerPort = document.createElement('div');
  winnerPort.className = `tb-port tb-port--winner${hasWinnerLink ? ' tb-port--connected' : ''}`;
  winnerPort.title = hasWinnerLink ? 'Winner linked' : 'Winner output';
  if (!hasWinnerLink) {
    winnerPort.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      callbacks.onPortMouseDown(node.id, 'winner');
    });
  }

  const loserPort = document.createElement('div');
  loserPort.className = 'tb-port tb-port--loser';
  loserPort.title = 'Loser output';
  loserPort.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    callbacks.onPortMouseDown(node.id, 'loser');
  });

  outputGroup.appendChild(winnerPort);
  outputGroup.appendChild(loserPort);
  ports.appendChild(inputPort);
  ports.appendChild(outputGroup);

  card.appendChild(header);
  card.appendChild(preview);
  if (roundsDiv) card.appendChild(roundsDiv);

  // Warning banner
  if (hasWarnings) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'tb-card-warning';
    warningDiv.textContent = '\u26a0 Issue';
    const detail = document.createElement('div');
    detail.className = 'tb-card-warning-detail';
    detail.textContent = warnings!.join('; ');
    warningDiv.appendChild(detail);
    warningDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      warningDiv.classList.toggle('tb-card-warning--open');
    });
    card.appendChild(warningDiv);
  }

  card.appendChild(ports);

  // Click to select
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onSelect(node.id);
  });

  // Double-click
  if (callbacks.onDoubleClick) {
    card.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      callbacks.onDoubleClick!(node.id);
    });
  }

  // Drag
  card.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).classList.contains('tb-port')) return;
    callbacks.onDragStart(node.id, e.clientX, e.clientY);
  });

  return card;
}

/**
 * Get port position relative to canvas for SVG edge rendering.
 */
export function getPortPosition(
  node: TopologyNode,
  portType: 'input' | 'winner' | 'loser',
): { x: number; y: number } {
  const cardWidth = getCardWidth(node);
  const cardHeight = 160;

  switch (portType) {
    case 'input':
      return { x: node.position.x, y: node.position.y + cardHeight / 2 };
    case 'winner':
      return { x: node.position.x + cardWidth, y: node.position.y + cardHeight / 2 - 8 };
    case 'loser':
      return { x: node.position.x + cardWidth, y: node.position.y + cardHeight / 2 + 8 };
  }
}
