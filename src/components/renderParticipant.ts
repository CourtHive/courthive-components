import { getParticipantContainerStyle, participantTypeStyle } from '../styles/participantStyle';
import { getChevronStyle } from '../styles/getChevronStyle';
import { renderIndividual } from './renderIndividual';
import { renderStatusPill } from './renderStatusPill';
import { isElement } from '../utilities/isElement';
import { renderTeamLogo } from './renderTeamLogo';
import { renderTick } from './renderTick';
import type { Composition, EventHandlers, MatchUp, Participant, Side } from '../types';

export function renderParticipant({
  initialRoundNumber = 1,
  eventHandlers,
  sideContainer,
  composition,
  participant,
  placeholder,
  sideNumber,
  matchUp
}: {
  initialRoundNumber?: number;
  eventHandlers?: EventHandlers;
  sideContainer?: boolean;
  composition?: Composition;
  participant?: Participant;
  placeholder?: any;
  sideNumber?: number;
  matchUp?: MatchUp;
}): HTMLElement {
  const { winningSide, matchUpType, isRoundRobin, matchUpStatus } = matchUp || {};
  const configuration = composition?.configuration;

  let drawPosition;
  const side = sideNumber ? matchUp?.sides?.find((side) => side.sideNumber === sideNumber) : undefined;
  if (!participant) {
    participant = side?.participant;

    drawPosition =
      configuration?.allDrawPositions ||
      (configuration?.drawPositions &&
        side?.drawPosition &&
        (matchUp?.roundNumber === initialRoundNumber || side?.participantFed || isRoundRobin))
        ? side?.drawPosition
        : '';
  }
  const isDoubles = matchUpType === 'DOUBLES';

  const firstParticipant = isDoubles ? participant?.individualParticipants?.[0] : participant;
  const secondParticipant = isDoubles && participant?.individualParticipants?.[1];
  const isWinningSide = Boolean(sideNumber === winningSide || (matchUpStatus === 'BYE' && participant));
  const winnerChevron = configuration?.winnerChevron && isWinningSide;

  const teamLogo = configuration?.teamLogo;
  const irregularEnding =
    ['RETIRED', 'DOUBLE_WALKOVER', 'WALKOVER', 'DEFAULTED'].includes(matchUpStatus) && !isWinningSide;
  const gameScoreOnly = configuration?.gameScoreOnly;

  const participantContainer = document.createElement('div');
  if (sideContainer) {
    participantContainer.className = getParticipantContainerStyle({
      drawPosition,
      sideNumber
    });
  }

  participantContainer.classList.add('tmx-p');
  participantContainer.setAttribute('id', participant?.participantId || '');

  if (teamLogo) {
    const logo = renderTeamLogo({ teamLogo });
    participantContainer.appendChild(logo);
  }

  const participantType = document.createElement('div');
  participantType.className = participantTypeStyle(
    isDoubles ? { variant: 'doubles' } : {}
  );

  const annotationDiv = document.createElement('div');
  annotationDiv.className = getChevronStyle({
    winnerChevron,
    isDoubles
  });

  const Individual = renderIndividual({
    individualParticipant: firstParticipant,
    eventHandlers,
    isWinningSide,
    composition,
    sideNumber,
    matchUp,
    side
  }).element;

  annotationDiv.appendChild(Individual);

  if (secondParticipant) {
    const Individual = renderIndividual({
      individualParticipant: secondParticipant,
      eventHandlers,
      isWinningSide,
      composition,
      sideNumber,
      matchUp,
      side
    }).element;

    annotationDiv.appendChild(Individual);
  } else if (isDoubles && placeholder && isElement(placeholder)) {
    annotationDiv.appendChild(placeholder);
  }

  participantType.appendChild(annotationDiv);
  participantContainer.appendChild(participantType);

  if (sideContainer) {
    const endMatter = document.createElement('div');
    if (isWinningSide && !gameScoreOnly) {
      const tick = renderTick();
      if (typeof tick === 'string') {
        endMatter.innerHTML = tick;
      } else {
        endMatter.appendChild(tick);
      }
    } else if (irregularEnding) {
      const statusPill = renderStatusPill({ matchUpStatus });
      endMatter.appendChild(statusPill);
    }

    participantContainer.appendChild(endMatter);
  }

  return participantContainer;
}
