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
  const { roundNumbers, roundProfile, roundsNotPowerOf2, hasNoRoundPositions } = tournamentEngine.getRoundMatchUps({
    matchUps
  });

  structureId = structureId || context?.structureId || matchUps?.[0]?.structureId;
  const isRoundRobin = matchUps.some(({ isRoundRobin }) => isRoundRobin);
  const isLucky = roundsNotPowerOf2 || hasNoRoundPositions;

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

  // Highlight all appearances of a participant on hover using event delegation.
  // Detect hover on .tmx-i (individual), then highlight the .tmx-p (participant container)
  // ancestor of every .tmx-i sharing the same participantId.
  let hoveredParticipantId: string | null = null;
  const setHover = (pid: string, add: boolean) => {
    div.querySelectorAll(`.tmx-i[id="${CSS.escape(pid)}"]`).forEach((el) => {
      const container = el.closest('.tmx-p');
      container?.classList.toggle('chc-participant-hover', add);
    });
  };
  div.addEventListener('mouseover', (e) => {
    const target = (e.target as HTMLElement).closest('.tmx-i') as HTMLElement | null;
    const pid = target?.id;
    if (pid && pid !== 'undefined' && pid !== hoveredParticipantId) {
      if (hoveredParticipantId) setHover(hoveredParticipantId, false);
      hoveredParticipantId = pid;
      setHover(pid, true);
    } else if ((!pid || pid === 'undefined') && hoveredParticipantId) {
      setHover(hoveredParticipantId, false);
      hoveredParticipantId = null;
    }
  });
  div.addEventListener('mouseleave', () => {
    if (hoveredParticipantId) {
      setHover(hoveredParticipantId, false);
      hoveredParticipantId = null;
    }
  });

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
