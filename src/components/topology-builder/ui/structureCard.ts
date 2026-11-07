/**
 * Structure Card — Card component for topology nodes.
 * Header (stage badge + name + size) + embedded schematic preview + ports.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { renderSchematicStructure } from '../../renderSchematicStructure';
import { generatePreviewMatchUps } from '../domain/previewGenerator';
import { getPlayoffProfiles } from '../domain/playoffProfilesCache';
import { getLuckyDrawTotalRounds } from '../domain/feedRounds';
import type { PlayoffOffer, TopologyNode } from '../types';

const {
  VOLUNTARY_CONSOLATION,
  CONSOLATION,
  QUALIFYING,
  ROUND_ROBIN,
  LUCKY_DRAW,
  PLAY_OFF,
  AD_HOC,
  WINNER,
  LOSER,
  MAIN
} = drawDefinitionConstants;

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
  if (node.structureType === LUCKY_DRAW) {
    return getLuckyDrawTotalRounds(node.drawSize);
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
  [VOLUNTARY_CONSOLATION]: 'tb-card-badge--voluntary'
};

/** The badge's short stage name; `VOLUNTARY_CONSOLATION` cut to four letters read `VOLU`. */
const BADGE_TEXT: Record<string, string> = { [VOLUNTARY_CONSOLATION]: 'VC' };

export interface RoundAnnotation {
  roundNumber: number;
  linkType: string; // WINNER, LOSER, POSITION
  direction: 'source' | 'target';
  edgeId: string;
  isSelected: boolean;
}

export interface PositionChip {
  position: number;
  edgeId: string;
  targetName: string;
}

/** What the `addPlayoffs` mode adds to a card. */
export interface CardPlayoffOffers {
  offers: PlayoffOffer[];
  onAddPlayoff: (offer: PlayoffOffer) => void;
}

/** Card extras beyond the positional parameters. */
export interface StructureCardExtras {
  /** The `addPlayoffs` mode: this card's chips, or none (the card is dimmed: nothing to add from it). */
  playoffOffers?: CardPlayoffOffers;
  /** A live draw: the mock-draw rounds line describes a draw that is not this one, so it is left out. */
  hideRoundsInfo?: boolean;
}

/** The chip's text: `+ 17–24`, an en dash as a range reads. */
export function offerLabel(offer: PlayoffOffer): string {
  const range = offer.finishingPositionRange.replace('-', '\u2013');
  if (offer.kind === 'voluntaryConsolation') return '+ Voluntary consolation';
  if (offer.kind === 'pagePlayoff') return `+ Page playoff ${range}`;
  return `+ ${range}`;
}

/** What a chip says it does, for its aria-label and title. */
function offerDescription(offer: PlayoffOffer): string {
  if (offer.kind === 'voluntaryConsolation') return 'Add a voluntary consolation that main-draw losers can opt into';
  if (offer.kind === 'pagePlayoff') {
    return `Add a page playoff for positions 1-4, in place of the 3-4 playoff, from losers of round ${offer.sourceRoundNumber}`;
  }
  const source =
    offer.sourceRoundNumber !== undefined
      ? `losers of round ${offer.sourceRoundNumber}`
      : `group position ${offer.groupFinishingPosition}`;
  return `Add a playoff for positions ${offer.finishingPositionRange}, from ${source}`;
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
  advanceInfo?: string,
  positionChips?: PositionChip[],
  extras: StructureCardExtras = {}
): HTMLElement {
  const hasWarnings = warnings && warnings.length > 0;
  const card = document.createElement('div');
  card.className = `tb-card${isSelected ? ' tb-card--selected' : ''}${hasWarnings ? ' tb-card--warning' : ''}`;
  card.style.left = `${node.position.x}px`;
  card.style.top = `${node.position.y}px`;
  card.style.minWidth = `${getCardWidth(node)}px`;
  card.setAttribute('data-node-id', node.id);

  const header = buildCardHeader(node, advanceInfo);

  // Preview
  const preview = document.createElement('div');
  preview.className = 'tb-card-preview';

  // A voluntary consolation is empty until players opt in: no positions to draw, and saying so is the preview
  const optIn = node.stage === VOLUNTARY_CONSOLATION && !node.matchUps?.length;
  const matchUps = optIn
    ? []
    : node.matchUps ||
      generatePreviewMatchUps({
        structureType: node.structureType,
        drawSize: node.drawSize,
        stage: node.stage,
        structureId: node.id,
        qualifyingPositions: node.qualifyingPositions,
        structureOptions: node.structureOptions
      });

  if (optIn) {
    preview.textContent = 'Main-draw losers opt in';
    preview.classList.add('tb-card-preview--opt-in');
  }

  if (matchUps.length > 0) {
    try {
      const schematic = renderSchematicStructure({
        matchUps,
        structureId: node.id,
        showHeaders: false
      });
      schematic.style.transform = 'scale(0.8)';
      schematic.style.transformOrigin = 'top left';
      preview.appendChild(schematic);
    } catch {
      preview.textContent = `${node.structureType} \u00d7${node.drawSize}`;
      preview.style.cssText +=
        'font-size:11px;color:var(--chc-text-muted);display:flex;align-items:center;justify-content:center;';
    }
  }

  // Apply round annotations — color matchup boxes in linked rounds
  if (roundAnnotations?.length && preview.querySelector('.chc-schematic-structure')) {
    const roundContainers = preview.querySelectorAll<HTMLElement>('.chc-schematic-round-container[data-round-number]');
    for (const container of roundContainers) {
      const rn = Number.parseInt(container.dataset.roundNumber || '0');
      const annotations = roundAnnotations.filter((a) => a.roundNumber === rn);
      if (!annotations.length) continue;

      // Apply CSS class to color the matchup slots in this round
      // Prefer selected annotation, then pick by priority: loser > winner > position
      const selected = annotations.find((a) => a.isSelected);
      const primary =
        selected ||
        annotations.find((a) => a.linkType === LOSER) ||
        annotations.find((a) => a.linkType === WINNER) ||
        annotations[0];

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

  const roundsDiv = extras.hideRoundsInfo ? null : buildRoundsInfo(node);

  // Ports
  const ports = document.createElement('div');
  ports.className = 'tb-card-ports';

  const inputPort = document.createElement('div');
  inputPort.className = 'tb-port tb-port--input';
  inputPort.title = 'Input';
  inputPort.addEventListener('mouseup', () => {
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

  // Finishing position chips for RR structures
  if (positionChips?.length) {
    const chipsDiv = document.createElement('div');
    chipsDiv.className = 'tb-card-chips';
    for (const chip of positionChips) {
      const chipEl = document.createElement('span');
      chipEl.className = 'tb-card-chip';
      chipEl.textContent = `P${chip.position}`;
      chipEl.title = `Position ${chip.position} → ${chip.targetName}`;
      chipEl.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onSelectEdge(chip.edgeId);
      });
      chipsDiv.appendChild(chipEl);
    }
    card.appendChild(chipsDiv);
  }

  if (roundsDiv) card.appendChild(roundsDiv);

  if (extras.playoffOffers) appendOfferChips(card, extras.playoffOffers, preview);

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

  // Drop target — releasing mouse anywhere on the card completes a link
  // Do NOT stopPropagation so the canvas mouseup still fires to clear drag state
  card.addEventListener('mouseup', () => {
    callbacks.onPortMouseUp(node.id);
  });

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

/** The card's header: stage badge, name, size, and a round robin's advance line. */
function buildCardHeader(node: TopologyNode, advanceInfo?: string): HTMLElement {
  const header = document.createElement('div');
  header.className = 'tb-card-header';

  const badge = document.createElement('span');
  badge.className = `tb-card-badge ${BADGE_CLASS[node.stage] || 'tb-card-badge--main'}`;
  badge.textContent = BADGE_TEXT[node.stage] ?? node.stage.substring(0, 4);

  const name = document.createElement('span');
  name.className = 'tb-card-name';
  name.textContent = node.structureName;

  const size = document.createElement('span');
  size.className = 'tb-card-size';
  // an opt-in consolation has no size until players join it
  size.textContent = node.stage === VOLUNTARY_CONSOLATION && !node.drawSize ? '' : `\u00d7${node.drawSize}`;

  header.append(badge, name, size);

  if (advanceInfo) {
    const advanceDiv = document.createElement('div');
    advanceDiv.className = 'tb-card-advance';
    advanceDiv.textContent = advanceInfo;
    header.appendChild(advanceDiv);
  }
  return header;
}

/**
 * What a structure of this type and size could feed, from a mock draw: a design-time answer, for the template builder.
 * A live draw leaves it out (`hideRoundsInfo`) — the draw's own answer comes as `addPlayoffs` chips.
 */
function buildRoundsInfo(node: TopologyNode): HTMLElement | null {
  const profiles = getPlayoffProfiles(node.structureType, node.drawSize, node.structureOptions?.groupSize);
  const text = profiles.playoffRoundsRanges?.length
    ? profiles.playoffRoundsRanges.map((r) => `R${r.roundNumber}:${r.finishingPositionRange}`).join(' ')
    : profiles.playoffFinishingPositionRanges
        ?.map((p) => `P${p.finishingPosition}:${p.finishingPositionRange}`)
        .join(' ');
  if (!text) return null;
  const roundsDiv = document.createElement('div');
  roundsDiv.className = 'tb-card-rounds';
  roundsDiv.textContent = text;
  return roundsDiv;
}

/**
 * The `addPlayoffs` chips: one button per playoff this structure could still feed.
 *
 * Pointing at a chip (hover or keyboard focus) boxes the round whose losers would play it off, so the operator sees
 * where the playoff comes from before choosing it. A round robin's playoffs come from a group finishing position,
 * which the schematic has no column for, so its chips box nothing. Clicking a chip is the whole choice: the host
 * attaches that one playoff — no list of every range to pick from (CA, 2026-11-08).
 */
function appendOfferChips(card: HTMLElement, { offers, onAddPlayoff }: CardPlayoffOffers, preview: HTMLElement): void {
  // a structure with nothing to add: no row, and the card steps back
  if (!offers.length) {
    card.classList.add('tb-card--no-offers');
    return;
  }
  const row = document.createElement('div');
  row.className = 'tb-card-offers';

  for (const offer of offers) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tb-card-offer';
    chip.dataset.offerKey = offer.key;
    chip.dataset.finishingPositionRange = offer.finishingPositionRange;
    chip.textContent = offerLabel(offer);
    chip.dataset.kind = offer.kind ?? 'playoff';
    chip.setAttribute('aria-label', offerDescription(offer));
    chip.title = offerDescription(offer);

    const round =
      offer.sourceRoundNumber === undefined
        ? null
        : preview.querySelector<HTMLElement>(
            `.chc-schematic-round-container[data-round-number="${offer.sourceRoundNumber}"]`
          );
    const point = (on: boolean) => round?.classList.toggle('tb-round-offer', on);
    chip.addEventListener('mouseenter', () => point(true));
    chip.addEventListener('mouseleave', () => point(false));
    chip.addEventListener('focus', () => point(true));
    chip.addEventListener('blur', () => point(false));

    // The card drags on mousedown and selects on click; a chip is neither.
    chip.addEventListener('mousedown', (e) => e.stopPropagation());
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      onAddPlayoff(offer);
    });
    row.appendChild(chip);
  }
  card.appendChild(row);
}

/**
 * Get port position relative to canvas for SVG edge rendering.
 */
export function getPortPosition(node: TopologyNode, portType: 'input' | 'winner' | 'loser'): { x: number; y: number } {
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
