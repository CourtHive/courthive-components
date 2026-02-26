/**
 * Round Card — Draggable round card element for the venue board.
 *
 * Stateless factory pattern: { element, update }.
 */

import type { RoundProfile, RoundLocator, Severity } from '../types';
import {
  spCardStyle,
  spCardTitleStyle,
  spCardMetaStyle,
  spChipsStyle,
  spChipStyle,
} from './styles';

export interface RoundCardData {
  round: RoundProfile;
  locator: RoundLocator;
  isSelected: boolean;
  severity: Severity | null;
}

export interface RoundCardCallbacks {
  onClick: (locator: RoundLocator) => void;
  onContextMenu?: (locator: RoundLocator, target: HTMLElement) => void;
}

export function buildRoundCard(
  data: RoundCardData,
  callbacks: RoundCardCallbacks,
): HTMLElement {
  const { round: r, locator, isSelected, severity } = data;
  const card = document.createElement('div');
  card.className = spCardStyle();
  if (isSelected) card.classList.add('selected');
  if (severity === 'ERROR') card.classList.add('error');
  else if (severity === 'WARN') card.classList.add('warn');

  card.draggable = true;

  card.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    e.dataTransfer!.setDragImage(card, card.offsetWidth / 2, 20);
    e.dataTransfer!.setData(
      'application/json',
      JSON.stringify({ type: 'PLANNED_ROUND', locator }),
    );
    e.dataTransfer!.effectAllowed = 'copyMove';
  });

  card.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onClick(locator);
  });

  if (callbacks.onContextMenu) {
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      callbacks.onContextMenu!(locator, card);
    });
  }

  // Title
  const titleEl = document.createElement('div');
  titleEl.className = spCardTitleStyle();
  titleEl.textContent =
    (r.eventName ? r.eventName + ' \u2014 ' : '') + (r.roundName ?? 'Round ' + r.roundNumber);
  card.appendChild(titleEl);

  // Meta
  const metaEl = document.createElement('div');
  metaEl.className = spCardMetaStyle();
  metaEl.textContent = `${r.drawId}/${r.structureId} \u00b7 rn=${r.roundNumber}`;
  card.appendChild(metaEl);

  // Chips
  const chips = document.createElement('div');
  chips.className = spChipsStyle();

  if (r.roundSegment) {
    chips.appendChild(
      makeChip(`Seg ${r.roundSegment.segmentNumber}/${r.roundSegment.segmentsCount}`, 'seg'),
    );
  }
  if (r.notBeforeTime) {
    chips.appendChild(makeChip(`NB ${r.notBeforeTime}`, 'nb'));
  }
  if (severity === 'ERROR') chips.appendChild(makeChip('Error', 'err'));
  else if (severity === 'WARN') chips.appendChild(makeChip('Warn', 'warn'));

  if (chips.children.length) card.appendChild(chips);

  return card;
}

function makeChip(text: string, kind: string): HTMLElement {
  const c = document.createElement('div');
  c.className = spChipStyle() + ' ' + kind;
  c.textContent = text;
  return c;
}
