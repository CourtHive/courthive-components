import { roundHeaderStyle } from '../../styles/roundHeaderStyle';
import { isFunction } from '../modal/cmodal';
import type { EventHandlers, MatchUp } from '../../types';

export function renderRoundHeader({
  eventHandlers,
  roundMatchUps,
  roundProfile,
  roundNumber,
  context
}: {
  eventHandlers?: EventHandlers;
  roundMatchUps?: MatchUp[];
  roundProfile?: any;
  roundNumber: number;
  context?: any;
}): HTMLElement {
  const div = document.createElement('div');
  div.className = roundHeaderStyle();

  div.classList.add('tmx-rh');
  div.setAttribute('roundNumber', String(roundNumber));

  const hasVisibility = isFunction(eventHandlers?.roundVisibilityClick);
  const hasAction = isFunction(eventHandlers?.roundHeaderClick);

  if (hasAction) {
    div.onclick = (pointerEvent) =>
      eventHandlers.roundHeaderClick({ roundNumber, roundProfile, roundMatchUps, context, pointerEvent });
  }

  const roundName = roundProfile?.[roundNumber]?.roundName;
  if (!roundName) return div;

  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:flex; flex-direction:row; justify-content:space-between;';

  const nameEl = document.createElement('div');
  nameEl.textContent = roundName;
  headerRow.appendChild(nameEl);

  const iconsEl = document.createElement('div');
  iconsEl.style.cssText = 'display:flex; align-items:center; gap:4px;';

  if (hasVisibility) {
    const eyeIcon = document.createElement('i');
    eyeIcon.className = 'fa-solid fa-eye tmx-rh-vis';
    eyeIcon.style.cssText = 'cursor:pointer; font-size:0.85rem; color:inherit; opacity:0.7; transition:opacity 0.15s;';
    eyeIcon.onmouseenter = () => (eyeIcon.style.opacity = '1');
    eyeIcon.onmouseleave = () => (eyeIcon.style.opacity = '0.7');
    eyeIcon.onclick = (pointerEvent) => {
      pointerEvent.stopPropagation();
      eventHandlers.roundVisibilityClick({ roundNumber, roundProfile, roundMatchUps, context, pointerEvent });
    };
    iconsEl.appendChild(eyeIcon);
  }

  if (hasAction) {
    const actionIcon = document.createElement('span');
    actionIcon.style.cssText = 'font-weight:bold; cursor:pointer;';
    actionIcon.textContent = '⋮';
    iconsEl.appendChild(actionIcon);
  }

  headerRow.appendChild(iconsEl);
  div.appendChild(headerRow);

  return div;
}
