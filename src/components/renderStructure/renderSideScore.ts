import { gameScoreStyle, tieBreakStyle, gameWrapperStyle } from '../../styles/scoreStyles';
import { scoreWrapperStyle } from '../../styles/scoreWrapperStyle';
import { renderGameScore } from './renderGameScore';
import { isFunction } from '../modal/cmodal';
import type { Composition, EventHandlers, MatchUp, SetScore } from '../../types';

export function setScore({
  gameScoreOnly,
  scoreStripes,
  set,
  sideNumber
}: {
  gameScoreOnly?: boolean;
  scoreStripes?: boolean;
  set: SetScore & { editing?: number };
  sideNumber: number;
}): HTMLElement {
  const isWinningSide = sideNumber === set?.winningSide;
  const variant = (isWinningSide && 'winner') || set?.winningSide ? 'loser' : undefined;
  const gameScore = sideNumber === 2 ? set.side2Score : set.side1Score;
  const hasTiebreakScore = set.side2TiebreakScore || set.side1TiebreakScore;
  const tieBreakScore = sideNumber === 2 ? set.side2TiebreakScore : set.side1TiebreakScore;
  const tieBreakSet = gameScore === undefined && tieBreakScore;
  const scoreDisplay = tieBreakSet || gameScore;
  const stripedScore = scoreStripes && set.setNumber % 2 ? 'lightgray' : 'transparent';

  const editing = set.editing;
  const activeEdit = editing ? set.editing === sideNumber : undefined;

  let p;
  if (activeEdit) {
    p = renderGameScore({ value: scoreDisplay });
  } else {
    p = document.createElement('p');
    p.className = gameScoreStyle({ variant });

    p.classList.add('tmx-st');
    p.setAttribute('setNumber', set.setNumber);

    p.style.backgroundColor = stripedScore;
    p.innerHTML = !isNaN(scoreDisplay) ? scoreDisplay : '';

    if (!gameScoreOnly) {
      const span = document.createElement('span');
      span.className = tieBreakStyle();
      span.innerHTML = hasTiebreakScore && !tieBreakSet ? String(tieBreakScore) : '';
      p.appendChild(span);
    }
  }

  return p;
}

export function renderSideScore({
  participantHeight,
  eventHandlers,
  composition,
  sideNumber,
  matchUp
}: {
  participantHeight?: number;
  eventHandlers?: EventHandlers;
  composition?: Composition;
  sideNumber: number;
  matchUp: MatchUp;
}): HTMLElement {
  const scoreStripes = composition?.configuration?.winnerChevron;
  const gameScoreOnly = composition?.configuration?.gameScoreOnly;
  const sets = matchUp?.score?.sets || [];

  const scoreBox = composition?.configuration?.scoreBox;
  const wrapperHeight = participantHeight ? (sideNumber === 2 ? participantHeight : participantHeight - 1) : undefined; // account for border!!

  const handleScoreClick = (pointerEvent: MouseEvent) => {
    if (isFunction(eventHandlers?.scoreClick)) {
      pointerEvent.stopPropagation();
      eventHandlers.scoreClick({ pointerEvent, matchUp });
    }
  };

  const div = document.createElement('div');
  div.className = scoreWrapperStyle(wrapperHeight)({
    ...(!scoreBox && sideNumber === 1 && { sideNumber: 1 }),
    fontSize: 'small'
  });

  div.classList.add('sideScore');
  div.classList.add('tmx-scr');

  div.onclick = handleScoreClick;

  const gameWrapper = document.createElement('div');
  gameWrapper.className = gameWrapperStyle();

  for (const set of sets || []) {
    const setScoreDisplay = setScore({
      gameScoreOnly,
      scoreStripes,
      sideNumber,
      set
    });
    gameWrapper.appendChild(setScoreDisplay);
  }

  div.appendChild(gameWrapper);

  return div;
}
