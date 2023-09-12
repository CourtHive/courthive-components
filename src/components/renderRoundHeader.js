import { roundHeaderStyle } from '../styles/roundHeaderStyle';

export function renderRoundHeader({ eventHandlers, roundProfile, roundNumber }) {
  const div = document.createElement('div');
  div.className = roundHeaderStyle();

  div.onclick = eventHandlers?.roundHeaderClick;

  const roundName = roundProfile?.[roundNumber]?.roundName;
  div.innerHTML = roundName || '';

  return div;
}
