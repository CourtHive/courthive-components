import { roundStyle } from '../styles/roundStyle';
import { renderMatchUp } from './renderMatchUp';

export function renderRound({
  selectedMatchUpId,
  eventHandlers,
  searchActive,
  composition,
  roundFactor,
  roundNumber,
  matchUps,
  isLucky
}) {
  const roundMatchUps = matchUps
    .filter((matchUp) => matchUp.roundNumber === roundNumber)
    .sort((a, b) => (a.roundPosition || 0) - (b.roundPosition || 0));

  const div = document.createElement('div');
  div.className = roundStyle();

  roundMatchUps.forEach((matchUp, i) => {
    const moeity = i % 2 === 0;
    if (roundFactor) matchUp.roundFactor = roundFactor;
    const m = renderMatchUp({
      selectedMatchUpId,
      eventHandlers,
      searchActive,
      composition,
      matchUp,
      isLucky,
      moeity
    });
    div.appendChild(m);
  });

  return div;
}
