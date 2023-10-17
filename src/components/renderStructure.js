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
  structureId,
  finalColumn,
  matchUps,
  context
}) {
  const { roundNumbers, roundProfile, hasOddMatchUpsCount, isNotEliminationStructure } = drawEngine.getRoundMatchUps({
    matchUps
  });

  structureId = structureId || context?.structureId || matchUps?.[0]?.structureId;
  const isRoundRobin = matchUps.some(({ isRoundRobin }) => isRoundRobin);
  const isLucky = hasOddMatchUpsCount || isNotEliminationStructure;

  const div = document.createElement('div');
  div.className = structureStyle();

  div.classList.add('tmx-str');
  if (structureId) {
    div.setAttribute('id', structureId);
  }

  const finalRoundNumber = Math.max(...roundNumbers);

  for (const roundNumber of roundNumbers) {
    const isFinalRound = roundNumber === finalRoundNumber;
    const round = renderRound({
      selectedMatchUpId,
      eventHandlers,
      isFinalRound,
      isRoundRobin,
      searchActive,
      composition,
      roundNumber,
      roundProfile,
      matchUps,
      context,
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
