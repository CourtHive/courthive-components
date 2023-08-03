import { getParticipantContainerStyle, participantTypeStyle } from '../styles/participantStyle';
import { getChevronStyle } from '../styles/getChevronStyle';
import { renderIndividual } from './renderIndividual';
import { renderStatusPill } from './renderStatusPill';
import { renderTeamLogo } from './renderTeamLogo';
import { renderTick } from './renderTick';

export function renderParticipant({ eventHandlers, sideContainer, composition, sideNumber, matchUp, participant }) {
  const { winningSide, matchUpType, isRoundRobin, matchUpStatus } = matchUp || {};
  const configuration = composition?.configuration;

  let drawPosition, side;
  if (!participant) {
    side = matchUp?.sides?.find((side) => side.sideNumber === sideNumber);
    participant = side?.participant;

    drawPosition =
      configuration?.allDrawPositions ||
      (configuration?.drawPositions &&
        side?.drawPosition &&
        (matchUp?.roundNumber === 1 || side?.participantFed || isRoundRobin))
        ? side?.drawPosition
        : '';
  }
  const isDoubles = participant?.individualParticipants?.length === 2 || matchUpType === 'DOUBLES';

  const firstParticipant = isDoubles ? participant?.individualParticipants?.[0] : participant;
  const secondParticipant = isDoubles && participant?.individualParticipants?.[1];
  const isWinningSide = sideNumber === winningSide || (matchUpStatus === 'BYE' && participant);
  const winnerChevron = configuration?.winnerChevron && isWinningSide;

  const teamLogo = configuration?.teamLogo;
  const irregularEnding =
    ['RETIRED', 'DOUBLE_WALKOVER', 'WALKOVER', 'DEFAULTED'].includes(matchUpStatus) && !isWinningSide;
  const gameScoreOnly = configuration?.gameScoreOnly;

  const participantContainer = document.createElement('div');
  participantContainer.className =
    sideContainer &&
    getParticipantContainerStyle({
      drawPosition,
      sideNumber
    });

  if (teamLogo) {
    const logo = renderTeamLogo({ teamLogo });
    participantContainer.appendChild(logo);
  }

  const participantType = document.createElement('div');
  participantType.className = participantTypeStyle({
    variant: isDoubles ? 'doubles' : 'singles'
  });

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
    matchUp,
    side
  });

  annotationDiv.appendChild(Individual);

  if (secondParticipant) {
    const Individual = renderIndividual({
      individualParticipant: secondParticipant,
      eventHandlers,
      isWinningSide,
      composition,
      matchUp,
      side
    });

    annotationDiv.appendChild(Individual);
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
