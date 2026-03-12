/**
 * MatchUp Card — Draggable matchUp card for the catalog.
 *
 * Shows "Player A vs Player B" with sides, event/round metadata, and chips.
 */

import type { CatalogMatchUpItem } from '../types';
import { matchUpLabel } from '../domain/utils';
import { isCompletedStatus } from '../domain/matchUpCatalogProjections';
import {
  splMatchUpCardStyle,
  splCardTitleStyle,
  splCardSidesStyle,
  splCardMetaStyle,
  splCardChipsStyle,
  splCardChipStyle,
} from './styles';

export interface MatchUpCardCallbacks {
  onClick?: (matchUp: CatalogMatchUpItem) => void;
}

export function buildMatchUpCard(
  item: CatalogMatchUpItem,
  callbacks: MatchUpCardCallbacks,
): HTMLElement {
  const card = document.createElement('div');
  card.className = splMatchUpCardStyle();
  card.setAttribute('data-matchup-id', item.matchUpId);

  const completed = isCompletedStatus(item.matchUpStatus);

  if (item.isScheduled) {
    card.classList.add('scheduled');
    card.draggable = false;
  } else if (completed) {
    card.classList.add('completed');
    card.draggable = false;
  } else {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      e.dataTransfer!.setDragImage(card, card.offsetWidth / 2, 20);
      e.dataTransfer!.setData(
        'application/json',
        JSON.stringify({ type: 'CATALOG_MATCHUP', matchUp: item }),
      );
      e.dataTransfer!.effectAllowed = 'copyMove';
    });
  }

  if (callbacks.onClick) {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onClick!(item);
    });
  }

  // Title: event — round
  const titleEl = document.createElement('div');
  titleEl.className = splCardTitleStyle();
  titleEl.textContent = `${item.eventName} \u2014 ${item.roundName ?? 'Round ' + item.roundNumber}`;
  card.appendChild(titleEl);

  // Sides: "Player A vs Player B" (or "TBD vs TBD" for unknown)
  const sidesEl = document.createElement('div');
  sidesEl.className = splCardSidesStyle();
  sidesEl.textContent = matchUpLabel(item);
  card.appendChild(sidesEl);

  // Meta
  const metaEl = document.createElement('div');
  metaEl.className = splCardMetaStyle();
  const parts: string[] = [];
  if (item.drawName) parts.push(item.drawName);
  if (item.matchUpType) parts.push(item.matchUpType.toLowerCase());
  metaEl.textContent = parts.join(' \u00b7 ');
  card.appendChild(metaEl);

  // Chips
  const chips = document.createElement('div');
  chips.className = splCardChipsStyle();

  if (item.scheduledTime) {
    chips.appendChild(makeChip(item.scheduledTime, 'time'));
  }
  if (item.scheduledCourtName) {
    chips.appendChild(makeChip(item.scheduledCourtName, 'court'));
  }
  if (item.matchUpFormat) {
    chips.appendChild(makeChip(item.matchUpFormat, 'type'));
  }

  // Status chip for completed matchUps
  if (completed && item.matchUpStatus) {
    const statusLabel = item.matchUpStatus.replace(/_/g, ' ');
    chips.appendChild(makeChip(statusLabel, 'status'));
  }

  if (chips.children.length) card.appendChild(chips);

  // Checkmark for scheduled
  if (item.isScheduled) {
    const check = document.createElement('span');
    check.className = 'spl-matchup-check';
    check.textContent = '\u2713';
    card.appendChild(check);
  }

  return card;
}

function makeChip(text: string, kind: string): HTMLElement {
  const c = document.createElement('div');
  c.className = splCardChipStyle() + ' ' + kind;
  c.textContent = text;
  return c;
}
