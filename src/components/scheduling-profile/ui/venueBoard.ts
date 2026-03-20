/**
 * Venue Board — Center panel: venue lanes with drop zones.
 *
 * Stateless factory pattern: { element, update }.
 */

import type { ProfileStoreState, UIPanel, DragPayload, DropTarget, RoundLocator } from '../types';
import { getVenueRounds, findIssuesForLocator, maxSeverity } from '../domain/profileProjections';
import { sameLocator, pickRoundKey } from '../domain/utils';
import { buildRoundCard } from './roundCard';
import {
  spPanelStyle,
  spPanelHeaderStyle,
  spPanelTitleStyle,
  spPanelMetaStyle,
  spBoardStyle,
  spVenueStyle,
  spVenueHeaderStyle,
  spVenueTitleStyle,
  spVenueSubStyle,
  spDropzoneStyle,
  spBadgeStyle,
  spSmallStyle,
  spInsertionLineStyle
} from './styles';

export interface VenueBoardCallbacks {
  onDrop: (drag: DragPayload, drop: DropTarget) => void;
  onCardClick: (locator: RoundLocator) => void;
  onCardContextMenu?: (locator: RoundLocator, target: HTMLElement) => void;
}

export function buildVenueBoard(callbacks: VenueBoardCallbacks): UIPanel<ProfileStoreState> {
  const root = document.createElement('div');
  root.className = spPanelStyle();

  // Header
  const header = document.createElement('div');
  header.className = spPanelHeaderStyle();
  const title = document.createElement('div');
  title.className = spPanelTitleStyle();
  title.textContent = 'Day Plan';
  const meta = document.createElement('div');
  meta.className = spPanelMetaStyle();
  header.appendChild(title);
  header.appendChild(meta);
  root.appendChild(header);

  // Board
  const board = document.createElement('div');
  board.className = spBoardStyle();
  root.appendChild(board);

  function update(state: ProfileStoreState): void {
    const date = state.selectedDate;
    meta.textContent = date ? `Selected: ${date}` : 'Select a date';
    board.innerHTML = '';

    // When many venues, switch to horizontal scroll with minimum column width
    const cols = Math.max(1, state.venues.length);
    const SCROLL_THRESHOLD = 4;
    if (cols > SCROLL_THRESHOLD) {
      board.classList.add('sp-board-scroll');
      board.style.gridTemplateColumns = '';
    } else {
      board.classList.remove('sp-board-scroll');
      board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    }

    for (const v of state.venues) {
      const venue = document.createElement('div');
      venue.className = spVenueStyle();

      // Venue header
      const vh = document.createElement('div');
      vh.className = spVenueHeaderStyle();

      const titleWrap = document.createElement('div');
      const vtitle = document.createElement('div');
      vtitle.className = spVenueTitleStyle();
      vtitle.textContent = v.name;
      const vsub = document.createElement('div');
      vsub.className = spVenueSubStyle();
      vsub.textContent = '';
      titleWrap.appendChild(vtitle);
      titleWrap.appendChild(vsub);

      const venueCounts = state.issueIndex.counts.byVenue[v.venueId];
      const badge = document.createElement('div');
      badge.className = spBadgeStyle();
      if (venueCounts?.ERROR) {
        badge.classList.add('err');
        badge.textContent = `${venueCounts.ERROR} err`;
      } else if (venueCounts?.WARN) {
        badge.classList.add('warn');
        badge.textContent = `${venueCounts.WARN} warn`;
      } else {
        badge.classList.add('ok');
        badge.textContent = 'OK';
      }

      vh.appendChild(titleWrap);
      vh.appendChild(badge);

      // Drop zone
      const dz = document.createElement('div');
      dz.className = spDropzoneStyle();
      dz.dataset.venue = v.venueId;

      if (date) {
        const rounds = getVenueRounds(state.profileDraft, date, v.venueId);

        if (!rounds.length) {
          const hint = document.createElement('div');
          hint.className = spSmallStyle();
          hint.textContent = 'Drop rounds here.';
          dz.appendChild(hint);
        }

        rounds.forEach((r, idx) => {
          const locator: RoundLocator = {
            date,
            venueId: v.venueId,
            index: idx,
            roundKey: pickRoundKey(r),
            roundSegment: r.roundSegment
          };

          const cardIssues = findIssuesForLocator(state.ruleResults, locator);
          const sev = maxSeverity(cardIssues);
          const isSelected = sameLocator(state.selectedLocator, locator);

          const card = buildRoundCard(
            { round: r, locator, isSelected, severity: sev },
            {
              onClick: callbacks.onCardClick,
              onContextMenu: callbacks.onCardContextMenu
            }
          );
          dz.appendChild(card);
        });
      } else {
        const hint = document.createElement('div');
        hint.className = spSmallStyle();
        hint.textContent = 'Select a date to plan.';
        dz.appendChild(hint);
      }

      // Insertion line element
      const insertionLine = document.createElement('div');
      insertionLine.className = spInsertionLineStyle();
      insertionLine.style.display = 'none';

      // Drop handlers
      dz.addEventListener('dragover', (e) => {
        if (!date) return;
        e.preventDefault();
        dz.classList.add('over');
        e.dataTransfer.dropEffect = 'move';

        const idx = calcInsertionIndex(dz, e.clientY, insertionLine);
        const cards = getDraggableCards(dz, insertionLine);
        insertionLine.style.display = '';
        if (idx < cards.length) {
          dz.insertBefore(insertionLine, cards[idx]);
        } else {
          dz.appendChild(insertionLine);
        }
      });
      dz.addEventListener('dragleave', (e) => {
        if (!dz.contains(e.relatedTarget as Node)) {
          dz.classList.remove('over');
          insertionLine.style.display = 'none';
        }
      });
      dz.addEventListener('drop', (e) => {
        dz.classList.remove('over');
        insertionLine.style.display = 'none';
        e.preventDefault();
        if (!date) return;

        let payload: DragPayload;
        try {
          payload = JSON.parse(e.dataTransfer.getData('application/json'));
        } catch {
          return;
        }
        const idx = calcInsertionIndex(dz, e.clientY, insertionLine);
        const drop: DropTarget = { date, venueId: v.venueId, index: idx };
        callbacks.onDrop(payload, drop);
      });

      venue.appendChild(vh);
      venue.appendChild(dz);
      board.appendChild(venue);
    }
  }

  return { element: root, update };
}

function getDraggableCards(dz: HTMLElement, exclude: HTMLElement): HTMLElement[] {
  return Array.from(dz.querySelectorAll<HTMLElement>('[draggable="true"]')).filter((el) => el !== exclude);
}

function calcInsertionIndex(dz: HTMLElement, clientY: number, exclude: HTMLElement): number {
  const cards = getDraggableCards(dz, exclude);
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (clientY < midY) return i;
  }
  return cards.length;
}
