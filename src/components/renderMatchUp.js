import { resultsInfoStyle, resultsItemStyle } from '../styles/resultStyles';
import { getSelectedMatchUpStyle } from '../styles/getSelectedMatchUpStyle';
import { matchUpContainerStyle } from '../styles/matchUpContainerStyle';
import { getMatchUpStyle } from '../styles/getMatchUpStyle';
import { renderCenterInfo } from './renderCenterInfo';
import { getLinkStyle } from '../styles/getLinkStyle';
import { isFunction } from './modal/cmodal';
import { renderSide } from './renderSide';
import cx from 'classnames';

export function renderMatchUp(params) {
  const { composition, initialRoundNumber = 1, matchUp, moiety, selectedMatchUpId, searchActive } = params;
  const { roundFactor, roundNumber, finishingRound, matchUpType, preFeedRound, stage } = matchUp;
  const isFinalRound = params.isFinalRound || parseInt(finishingRound) === 1;
  const isQualifying = stage === 'QUALIFYING' && isFinalRound;

  // NOTE: is it desireable to have trailing - for final round of qualifying?
  // const qualifyingStage = stage === 'QUALIFYING';
  // const noProgression = !qualifyingStage && isFinalRound;

  const noProgression = isFinalRound;
  const isFirstRound = parseInt(roundNumber) === initialRoundNumber;
  const isDoubles = matchUpType === 'DOUBLES';
  const link =
    ((searchActive || matchUp.isRoundRobin || matchUp.collectionId || params.isLucky || params.isAdHoc) && 'mr') ||
    (noProgression && 'noProgression') ||
    ((isQualifying || preFeedRound) && 'm0') ||
    (moiety && 'm1') ||
    'm2';

  const linkClass = getLinkStyle({ composition, isDoubles, roundFactor })({
    isFirstRound,
    link
  });

  const configuration = composition?.configuration || {};
  const { resultsInfo, centerInfo } = configuration || {};

  const eventHandlers = params.eventHandlers || {};
  const handleOnClick = (pointerEvent) => {
    if (isFunction(eventHandlers?.matchUpClick)) {
      eventHandlers.matchUpClick({ pointerEvent, matchUp });
    }
  };

  const container = document.createElement('div');
  container.className = cx(composition.theme, params?.className, 'matchup', matchUpContainerStyle());

  // event metadata
  container.classList.add('tmx-m');
  container.setAttribute('id', matchUp?.matchUpId);

  container.onclick = handleOnClick;

  const component = document.createElement('div');
  component.className = getMatchUpStyle({ configuration });

  const entryStatusDisplay = ({ sideNumber }) => {
    const entryStatus = matchUp?.sides
      .find((s) => s.sideNumber === sideNumber)
      ?.participant?.entryStatus?.replace('_', ' ');

    const className = sideNumber === 2 && linkClass;

    return renderCenterInfo({
      eventHandlers,
      entryStatus,
      sideNumber,
      className,
      matchUp
    });
  };

  const side1 = renderSide({
    initialRoundNumber,
    eventHandlers,
    sideNumber: 1,
    composition,
    matchUp
  });
  const side2 = renderSide({
    className: !centerInfo && linkClass,
    initialRoundNumber,
    eventHandlers,
    sideNumber: 2,
    composition,
    matchUp
  });

  component.appendChild(side1);
  if (centerInfo) {
    const s1 = entryStatusDisplay({ sideNumber: 1 });
    const s2 = entryStatusDisplay({ sideNumber: 2 });
    component.appendChild(s1.element);
    component.appendChild(s2.element);
  }
  component.appendChild(side2);

  if (resultsInfo) {
    const info = renderResultsInfo({ score: matchUp.score });
    component.appendChild(info);
  }

  container.appendChild(component);

  if (selectedMatchUpId === matchUp.matchUpId) {
    const selected = document.createElement('div');
    selected.className = getSelectedMatchUpStyle();
    container.appendChild(selected);
  }

  return container;
}

function renderResultsInfo({ score }) {
  const sets = score?.sets?.filter(Boolean).sort((a, b) => (a.setNumber || 0) - (b.setNumber || 0));
  const finalSet = sets?.[sets.length - 1];
  const points = finalSet?.side1PointsScore || finalSet?.side2PointsScore;

  const div = document.createElement('div');
  div.className = resultsInfoStyle();

  if (points) {
    const pts = document.createElement('div');
    pts.className = resultsItemStyle({ variant: 'points' });
    pts.innerHTML = 'PTS';
    div.appendChild(pts);
  }

  for (const set of sets || []) {
    const setDiv = document.createElement('div');
    setDiv.setAttribute('key', set.setNumber);
    setDiv.className = resultsItemStyle({ variant: 'set' });
    setDiv.innerHTML = set.setNumber;
    div.appendChild(setDiv);
  }

  return div;
}
