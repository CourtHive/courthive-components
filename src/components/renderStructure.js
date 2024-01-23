import { roundContainerStyle } from '../styles/roundContainerStyle';
import { tournamentEngine } from 'tods-competition-factory';
import { structureStyle } from '../styles/structureStyle';
import { roundStyle } from '../styles/roundStyle';
import { renderRound } from './renderRound';

export function renderStructure({
  initialRoundNumber = 1,
  selectedMatchUpId,
  eventHandlers,
  searchActive,
  composition,
  structureId,
  finalColumn,
  matchUps,
  context
}) {
  const { roundNumbers, roundProfile, hasOddMatchUpsCount, isNotEliminationStructure } =
    tournamentEngine.getRoundMatchUps({ matchUps });

  structureId = structureId || context?.structureId || matchUps?.[0]?.structureId;
  const isRoundRobin = matchUps.some(({ isRoundRobin }) => isRoundRobin);
  const isLucky = hasOddMatchUpsCount || isNotEliminationStructure;

  const div = document.createElement('div');
  div.className = structureStyle();

  div.classList.add('tmx-str');
  div.setAttribute('id', structureId);

  const finalRoundNumber = Math.max(...roundNumbers);

  for (const roundNumber of roundNumbers) {
    if (roundNumber < initialRoundNumber) continue;
    const isFinalRound = roundNumber === finalRoundNumber;
    const round = renderRound({
      initialRoundNumber,
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
