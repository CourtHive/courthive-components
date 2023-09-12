import { structureStyle } from '../styles/structureStyle';
import { drawEngine } from 'tods-competition-factory';
import { renderRound } from './renderRound';

export function renderStructure({ selectedMatchUpId, eventHandlers, searchActive, composition, matchUps }) {
  const { roundNumbers, roundProfile, hasOddMatchUpsCount } = drawEngine.getRoundMatchUps({
    matchUps
  });

  const isRoundRobin = matchUps.some(({ isRoundRobin }) => isRoundRobin);

  const isLucky = hasOddMatchUpsCount;

  const div = document.createElement('div');
  div.className = structureStyle();

  for (const roundNumber of roundNumbers) {
    const round = renderRound({
      selectedMatchUpId,
      eventHandlers,
      isRoundRobin,
      searchActive,
      composition,
      roundNumber,
      roundProfile,
      matchUps,
      isLucky
    });
    div.appendChild(round);
  }

  return div;
}
