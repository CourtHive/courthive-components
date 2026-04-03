import { getParticipantContainerStyle, participantTypeStyle } from '../../styles/participantStyle';
import { getChevronStyle } from '../../styles/getChevronStyle';
import { renderIndividual } from './renderIndividual';
import { renderStatusPill } from './renderStatusPill';
import { isElement } from '../../utilities/isElement';
import { renderTeamLogo } from './renderTeamLogo';
import { renderTick } from './renderTick';

import type { Composition, EventHandlers, MatchUp, Participant } from '../../types';
import { matchUpStatusConstants } from 'tods-competition-factory';

const { WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT, RETIRED, SUSPENDED, CANCELLED, IN_PROGRESS, ABANDONED } =
  matchUpStatusConstants;

function buildEndMatter({
  configuration,
  matchUp,
  eventHandlers,
  sideNumber,
  winningSide,
  matchUpStatus,
  isWinningSide,
  gameScoreOnly,
  irregularEnding
}): HTMLElement {
  const endMatter = document.createElement('div');
  const inlineScoring = configuration?.inlineScoring;
  const isReadyToScore = matchUp?.readyToScore;
  const isCompleted = Boolean(winningSide || matchUpStatus === 'COMPLETED');
  const isLiveStatus = !matchUpStatus || matchUpStatus === 'IN_PROGRESS' || matchUpStatus === 'TO_BE_PLAYED';

  if (inlineScoring && isReadyToScore && !isCompleted && isLiveStatus) {
    const livePill = renderStatusPill({ matchUpStatus: IN_PROGRESS });
    livePill.classList.add('chc-live-chip');
    livePill.addEventListener('click', (e) => {
      e.stopPropagation();
      eventHandlers?.pillClick?.({ pointerEvent: e, matchUp: matchUp!, sideNumber: sideNumber! });
    });
    endMatter.appendChild(livePill);
  } else if (isWinningSide && !gameScoreOnly) {
    const tick = renderTick();
    if (typeof tick === 'string') {
      endMatter.innerHTML = tick;
    } else {
      endMatter.appendChild(tick);
    }
  } else if (irregularEnding) {
    const statusPill = renderStatusPill({ matchUpStatus });
    if (inlineScoring) {
      statusPill.classList.add('chc-live-chip');
      statusPill.addEventListener('click', (e) => {
        e.stopPropagation();
        eventHandlers?.pillClick?.({ pointerEvent: e, matchUp: matchUp!, sideNumber: sideNumber! });
      });
    }
    endMatter.appendChild(statusPill);
  }

  return endMatter;
}

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
  const isWinningSide = Boolean(
    (winningSide && sideNumber === winningSide) || (matchUpStatus === 'BYE' && participant)
  );
  const winnerChevron = configuration?.winnerChevron && isWinningSide;

  const teamLogo = configuration?.teamLogo;
  const irregularEnding =
    [
      RETIRED,
      WALKOVER,
      DEFAULTED,
      DOUBLE_WALKOVER,
      DOUBLE_DEFAULT,
      SUSPENDED,
      CANCELLED,
      IN_PROGRESS,
      ABANDONED
    ].includes(matchUpStatus) && !isWinningSide;
  const gameScoreOnly = configuration?.gameScoreOnly;

  const participantContainer = document.createElement('div');
  if (sideContainer) {
    participantContainer.className = getParticipantContainerStyle({
      drawPosition,
      sideNumber
    });
    if (drawPosition) {
      participantContainer.dataset.drawPosition = String(drawPosition);
      if (configuration?.drawPositionColor) {
        participantContainer.style.setProperty('--chc-draw-position-color', configuration.drawPositionColor);
      }
    }
  }

  participantContainer.classList.add('tmx-p');
  participantContainer.setAttribute('id', participant?.participantId || '');

  if (teamLogo) {
    const logo = renderTeamLogo({ teamLogo, participantId: participant?.participantId });
    participantContainer.appendChild(logo);
  }

  const participantType = document.createElement('div');
  participantType.className = participantTypeStyle(isDoubles ? { variant: 'doubles' } : {});

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
    participantContainer.appendChild(
      buildEndMatter({
        configuration,
        matchUp,
        eventHandlers,
        sideNumber,
        winningSide,
        matchUpStatus,
        isWinningSide,
        gameScoreOnly,
        irregularEnding
      })
    );
  }

  return participantContainer;
}
