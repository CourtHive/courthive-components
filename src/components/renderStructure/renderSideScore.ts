import { gameScoreStyle, tieBreakStyle, gameWrapperStyle, pointScoreStyle } from '../../styles/scoreStyles';
import { resultsItemStyle } from '../../styles/resultStyles';
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
  const stripedScore = scoreStripes && set.setNumber % 2 ? 'var(--chc-bg-secondary)' : 'transparent';

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
  const gameScoreConfig = composition?.configuration?.gameScore;
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
  div.className = scoreWrapperStyle()({
    ...(!scoreBox && sideNumber === 1 && { sideNumber: 1 }),
    fontSize: 'small'
  });
  if (wrapperHeight) div.style.height = `${wrapperHeight}px`;

  div.classList.add('sideScore');
  div.classList.add('tmx-scr');

  div.onclick = handleScoreClick;

  const gameWrapper = document.createElement('div');
  gameWrapper.className = gameWrapperStyle();

  // Build point score element if configured and data is present
  let pointScoreEl: HTMLElement | undefined;
  if (gameScoreConfig && sets.length > 0) {
    const lastSet = sets[sets.length - 1];
    const hasPointScore = lastSet.side1PointsScore != null || lastSet.side2PointsScore != null;

    if (hasPointScore) {
      const pointValue = sideNumber === 2 ? lastSet.side2PointsScore : lastSet.side1PointsScore;
      const position = gameScoreConfig.position || 'trailing';
      const inverted = gameScoreConfig.inverted !== false;

      pointScoreEl = document.createElement('p');
      pointScoreEl.className = pointScoreStyle({ inverted, position });
      pointScoreEl.textContent = pointValue != null ? String(pointValue) : '';
    }
  }

  const resultsInfo = composition?.configuration?.resultsInfo && sideNumber === 1;

  // When resultsInfo is enabled, the game-wrapper and its column children must
  // stretch to the full score-wrapper height so labels anchor at the dividing line.
  if (resultsInfo) {
    gameWrapper.style.alignSelf = 'stretch';
  }

  const wrapCol = (child: HTMLElement, labelText: string, variant: string) => {
    const col = document.createElement('div');
    col.style.cssText = 'position:relative; align-self:stretch; display:flex; align-items:center;';
    col.appendChild(child);

    const label = document.createElement('div');
    label.className = resultsItemStyle({ variant });
    label.textContent = labelText;
    col.appendChild(label);

    return col;
  };

  // Insert leading point score before set scores
  if (pointScoreEl && gameScoreConfig?.position === 'leading') {
    if (resultsInfo) {
      gameWrapper.appendChild(wrapCol(pointScoreEl, 'PTS', 'points'));
    } else {
      gameWrapper.appendChild(pointScoreEl);
    }
  }

  for (const set of sets || []) {
    const setScoreDisplay = setScore({
      gameScoreOnly,
      scoreStripes,
      sideNumber,
      set
    });

    if (resultsInfo) {
      gameWrapper.appendChild(wrapCol(setScoreDisplay, String(set.setNumber), 'set'));
    } else {
      gameWrapper.appendChild(setScoreDisplay);
    }
  }

  // Append trailing point score after set scores (default)
  if (pointScoreEl && gameScoreConfig?.position !== 'leading') {
    if (resultsInfo) {
      gameWrapper.appendChild(wrapCol(pointScoreEl, 'PTS', 'points'));
    } else {
      gameWrapper.appendChild(pointScoreEl);
    }
  }

  div.appendChild(gameWrapper);

  return div;
}
