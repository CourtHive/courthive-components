import { getChevronStyle } from '../styles/getChevronStyle';
import { renderIndividual } from './renderIndividual';
import { renderStatusPill } from './renderStatusPill';
import { renderTeamLogo } from './renderTeamLogo';
import { renderTick } from './renderTick';
import { getParticipantContainerStyle, participantTypeStyle } from '../styles/participantStyle';

export function renderParticipant({ eventHandlers, sideContainer, composition, sideNumber, matchUp }) {
  const { winningSide, matchUpType, isRoundRobin } = matchUp;
  const configuration = composition.configuration;
  const isDoubles = matchUpType === 'DOUBLES';
  const matchUpStatus = matchUp.matchUpStatus;

  const side = matchUp?.sides?.find((side) => side.sideNumber === sideNumber);
  const drawPosition =
    configuration.allDrawPositions ||
    (configuration.drawPositions &&
      side?.drawPosition &&
      (matchUp.roundNumber === 1 || side.participantFed || isRoundRobin))
      ? side?.drawPosition
      : '';

  const firstParticipant = isDoubles ? side?.participant?.individualParticipants?.[0] : side?.participant;
  const secondParticipant = isDoubles && side?.participant?.individualParticipants?.[1];
  const isWinningSide = sideNumber === winningSide || (matchUpStatus === 'BYE' && side?.participant);
  const winnerChevron = configuration?.winnerChevron && isWinningSide;

  const teamLogo = configuration?.teamLogo;
  const irregularEnding =
    ['RETIRED', 'DOUBLE_WALKOVER', 'WALKOVER', 'DEFAULTED'].includes(matchUpStatus) && !isWinningSide;
  const gameScoreOnly = composition?.configuration?.gameScoreOnly;

  const participantContainer = document.createElement('div');
  participantContainer.className = getParticipantContainerStyle({
    sideNumber: sideContainer && sideNumber,
    drawPosition
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
