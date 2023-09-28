import { roundContainerStyle } from '../styles/roundContainerStyle';
import { structureStyle } from '../styles/structureStyle';
import { drawEngine } from 'tods-competition-factory';
import { roundStyle } from '../styles/roundStyle';
import { renderRound } from './renderRound';

export function renderStructure({
  selectedMatchUpId,
  eventHandlers,
  searchActive,
  composition,
  finalColumn,
  matchUps
}) {
  const { roundNumbers, roundProfile, hasOddMatchUpsCount, isNotEliminationStructure } = drawEngine.getRoundMatchUps({
    matchUps
  });

  const isRoundRobin = matchUps.some(({ isRoundRobin }) => isRoundRobin);

  const isLucky = hasOddMatchUpsCount || isNotEliminationStructure;

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

  if (finalColumn) {
    const roundContainer = document.createElement('div');
    roundContainer.className = roundContainerStyle();

    const roundContent = document.createElement('div');
    roundContent.className = roundStyle();
    roundContent.appendChild(finalColumn);

    roundContainer.appendChild(roundContent);
    div.appendChild(roundContainer);
  }

  return div;
}
