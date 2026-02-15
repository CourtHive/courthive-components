import { roundContainerStyle } from '../../styles/roundContainerStyle';
import { tournamentEngine } from 'tods-competition-factory';
import { structureStyle } from '../../styles/structureStyle';
import { roundStyle } from '../../styles/roundStyle';
import { renderRound } from './renderRound';
import type { Composition, EventHandlers, MatchUp } from '../../types';

export function renderStructure({
  initialRoundNumber = 1,
  selectedMatchUpId,
  eventHandlers,
  searchActive,
  composition,
  structureId,
  finalColumn,
  matchUps,
  minWidth,
  context
}: {
  initialRoundNumber?: number;
  selectedMatchUpId?: string;
  eventHandlers?: EventHandlers;
  searchActive?: boolean;
  composition?: Composition;
  structureId?: string;
  finalColumn?: boolean | HTMLElement;
  matchUps: MatchUp[];
  minWidth?: string;
  context?: any;
}): HTMLElement {
  const { roundNumbers, roundProfile, hasOddMatchUpsCount, isNotEliminationStructure } =
    tournamentEngine.getRoundMatchUps({ matchUps });

  structureId = structureId || context?.structureId || matchUps?.[0]?.structureId;
  const isRoundRobin = matchUps.some(({ isRoundRobin }) => isRoundRobin);
  const isLucky = hasOddMatchUpsCount || isNotEliminationStructure;

  const div = document.createElement('div');
  div.className = structureStyle();

  div.classList.add('tmx-str');
  div.setAttribute('id', structureId || '');

  const finalRoundNumber = roundNumbers.length ? Math.max.apply(null, roundNumbers) : 0;

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
      minWidth,
      context,
      isLucky
    });
    div.appendChild(round);
  }

  if (finalColumn && typeof finalColumn !== 'boolean') {
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
