import { roundHeaderStyle } from '../styles/roundHeaderStyle';
import { isFunction } from './modal/cmodal';

export function renderRoundHeader({ eventHandlers, roundMatchUps, roundProfile, roundNumber, context }) {
  const div = document.createElement('div');
  div.className = roundHeaderStyle();

  const hasAction = isFunction(eventHandlers?.roundHeaderClick);
  if (hasAction) {
    div.onclick = (pointerEvent) =>
      eventHandlers.roundHeaderClick({ roundNumber, roundProfile, roundMatchUps, context, pointerEvent });
  }

  // CONSIDER: multiple icons depending on available methods, e.g. roundScheduleClick, roundActionsClick
  const headerAction = hasAction ? '⋮' : '';
  // const headerAction = hasAction ? '&#128197;' : '';

  const roundName = roundProfile?.[roundNumber]?.roundName;
  const header =
    roundName &&
    ` <div style="display: flex; flex-direction: row; justify-content: space-between">
        <div>${roundName}</div>
        <div style="font-weight: bold">${headerAction}</div>
      </div>
  `;
  div.innerHTML = header || '';

  return div;
}
