import { roundHeaderStyle } from '../styles/roundHeaderStyle';
import { isFunction } from './modal/cmodal';

export function renderRoundHeader({ eventHandlers, roundMatchUps, roundProfile, roundNumber }) {
  const div = document.createElement('div');
  div.className = roundHeaderStyle();

  if (isFunction(eventHandlers?.roundHeaderClick)) {
    div.onclick = () => eventHandlers.roundHeaderClick({ roundNumber, roundProfile, roundMatchUps });
  }

  const roundName = roundProfile?.[roundNumber]?.roundName;
  div.innerHTML = roundName || '';

  return div;
}
