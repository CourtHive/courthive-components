import { sideContainerStyle, sideRowStyle } from '../styles/sideStyles';
import { scoreWrapperStyle } from '../styles/scoreWrapperStyle';
import { renderParticipant } from './renderParticipant';
import { tournamentEngine } from 'tods-competition-factory';
import { renderSideScore } from './renderSideScore';
import { renderSchedule } from './renderSchedule';
import { isFunction } from './modal/cmodal';
import cx from 'classnames';
import type { Composition, EventHandlers, MatchUp } from '../types';

export function renderSide({ 
  initialRoundNumber = 1, 
  eventHandlers, 
  composition, 
  sideNumber, 
  className, 
  matchUp 
}: {
  initialRoundNumber?: number;
  eventHandlers?: EventHandlers;
  composition?: Composition;
  sideNumber: number;
  className?: string;
  matchUp: MatchUp;
}): HTMLElement {
  const configuration = composition?.configuration || {};
  const scheduleInfo = configuration?.scheduleInfo;

  const hasScore = matchUp?.score?.scoreStringSide1;
  const scoreBox = composition?.configuration?.scoreBox && hasScore;
  const readyToScore =
    matchUp?.readyToScore && eventHandlers?.scoreClick && !tournamentEngine.checkScoreHasValue({ matchUp });

  const div = document.createElement('div');
  div.className = cx(sideContainerStyle(), className);

  div.classList.add('tmx-sd');
  div.setAttribute('sideNumber', String(sideNumber));

  if (scheduleInfo && sideNumber === 1) {
    const schedule = renderSchedule({ matchUp, eventHandlers });
    div.appendChild(schedule);
  }

  const sideRow = document.createElement('div');
  sideRow.className = sideRowStyle();

  const participant = renderParticipant({
    sideContainer: true,
    initialRoundNumber,
    eventHandlers,
    composition,
    sideNumber,
    matchUp
  });

  sideRow.appendChild(participant);

  if (scoreBox) {
    const box = document.createElement('div');
    box.style.border = `1px solid lightgray`;
    sideRow.appendChild(box);
  }

  if (hasScore) {
    const sideScore = renderSideScore({
      eventHandlers,
      composition,
      sideNumber,
      matchUp
    });
    sideRow.appendChild(sideScore);
  }

  if (readyToScore) {
    const handleScoreClick = (pointerEvent: MouseEvent) => {
      if (isFunction(eventHandlers?.scoreClick)) {
        pointerEvent.stopPropagation();
        eventHandlers.scoreClick({ pointerEvent, matchUp });
      }
    };
    const score = document.createElement('div');
    score.className = scoreWrapperStyle(undefined)({
      ...((!scoreBox && sideNumber === 1) && { sideNumber: 1 }),
      fontSize: 'small'
    });
    score.onclick = handleScoreClick;
    score.innerHTML = `[Score]`;
    sideRow.appendChild(score);
  }

  div.appendChild(sideRow);

  return div;
}
