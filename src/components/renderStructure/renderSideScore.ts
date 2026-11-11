import { gameScoreStyle, tieBreakStyle, gameWrapperStyle, pointScoreStyle } from '../../styles/scoreStyles';
import { scoreWrapperStyle } from '../../styles/scoreWrapperStyle';
import { setScoreView, sideScoreCells } from './sideScoreModel';
import { resultsItemStyle } from '../../styles/resultStyles';
import { renderGameScore } from './renderGameScore';
import { isFunction } from '../modal/cmodal';

// constants and types
import type { Composition, EventHandlers, MatchUp, SetScore } from '../../types';
import type { PointScoreView } from './sideScoreModel';

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
  const { variant, scoreDisplay, text, tiebreak, background } = setScoreView({
    gameScoreOnly,
    scoreStripes,
    sideNumber,
    set
  });

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

    p.style.backgroundColor = background;
    p.innerHTML = text;

    if (tiebreak !== undefined) {
      const span = document.createElement('span');
      span.className = tieBreakStyle();
      span.innerHTML = tiebreak;
      p.appendChild(span);
    }
  }

  return p;
}

function buildPointScoreEl(point: PointScoreView, sideNumber, composition, eventHandlers, matchUp): HTMLElement {
  const pointScoreEl = document.createElement('p');
  pointScoreEl.className = pointScoreStyle({ inverted: point.inverted, position: point.position });
  pointScoreEl.textContent = point.text;

  const inlineConfig = composition?.configuration?.inlineScoring;
  if (inlineConfig && point.inPlay) {
    pointScoreEl.classList.add('chc-inline-scoring-clickable');
    pointScoreEl.style.cursor = 'pointer';
    pointScoreEl.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      eventHandlers?.scoreIncrement?.({ matchUpId: matchUp.matchUpId, sideNumber, scoreType: 'point' });
    };
  }

  return pointScoreEl;
}

function makeInlineScoringClickable(el, inlineScoringConfig, eventHandlers, matchUp, sideNumber): void {
  el.classList.add('chc-inline-scoring-clickable');
  el.style.cursor = 'pointer';
  el.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const scoreType = inlineScoringConfig.mode === 'games' ? 'game' : 'point';
    eventHandlers?.scoreIncrement?.({ matchUpId: matchUp.matchUpId, sideNumber, scoreType });
  };
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

  const resultsInfo = composition?.configuration?.resultsInfo && sideNumber === 1;

  if (resultsInfo) {
    gameWrapper.style.alignSelf = 'stretch';
  }

  const wrapCol = (child: HTMLElement, labelText: string | undefined, variant: string) => {
    if (labelText === undefined) return child;
    const col = document.createElement('div');
    col.style.cssText = 'position:relative; align-self:stretch; display:flex; align-items:center;';
    col.appendChild(child);

    const label = document.createElement('div');
    label.className = resultsItemStyle({ variant });
    label.textContent = labelText;
    col.appendChild(label);

    return col;
  };

  const inlineScoringConfig = composition?.configuration?.inlineScoring;
  const cells = sideScoreCells({
    resultsInfo: composition?.configuration?.resultsInfo,
    gameScore: gameScoreConfig,
    sideNumber,
    matchUp
  });

  for (const cell of cells) {
    if (cell.kind === 'point') {
      const pointScoreEl = buildPointScoreEl(cell.point, sideNumber, composition, eventHandlers, matchUp);
      gameWrapper.appendChild(wrapCol(pointScoreEl, cell.label, 'points'));
      continue;
    }
    const { set } = cell;
    const setScoreDisplay = setScore({
      gameScoreOnly,
      scoreStripes,
      sideNumber,
      set
    });

    if (inlineScoringConfig && !set.winningSide) {
      makeInlineScoringClickable(setScoreDisplay, inlineScoringConfig, eventHandlers, matchUp, sideNumber);
    }

    gameWrapper.appendChild(wrapCol(setScoreDisplay, cell.label, 'set'));
  }

  div.appendChild(gameWrapper);

  return div;
}
