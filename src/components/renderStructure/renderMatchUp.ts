import { getSelectedMatchUpStyle } from '../../styles/getSelectedMatchUpStyle';
import { matchUpContainerStyle } from '../../styles/matchUpContainerStyle';
import { getMatchUpStyle } from '../../styles/getMatchUpStyle';
import { renderCenterInfo } from './renderCenterInfo';
import { getLinkStyle } from '../../styles/getLinkStyle';
import { isFunction } from '../modal/cmodal';
import { renderSide } from './renderSide';
import cx from 'classnames';
import type { Composition, EventHandlers, MatchUp } from '../../types';

export function renderMatchUp(params: {
  composition?: Composition;
  initialRoundNumber?: number;
  matchUp: MatchUp;
  moiety?: boolean;
  selectedMatchUpId?: string;
  searchActive?: boolean;
  isFinalRound?: boolean;
  isLucky?: boolean;
  isAdHoc?: boolean;
  eventHandlers?: EventHandlers;
  className?: string;
}): HTMLElement {
  const { composition, initialRoundNumber = 1, matchUp, moiety, selectedMatchUpId, searchActive } = params;
  const { roundFactor, roundNumber, finishingRound, matchUpType, preFeedRound, stage } = matchUp;
  const isFinalRound = params.isFinalRound || (finishingRound ? Number.parseInt(String(finishingRound)) === 1 : false);
  const isQualifying = stage === 'QUALIFYING' && isFinalRound;

  // NOTE: is it desireable to have trailing - for final round of qualifying?
  // const qualifyingStage = stage === 'QUALIFYING';
  // const noProgression = !qualifyingStage && isFinalRound;

  const noProgression = isFinalRound;
  const isFirstRound = roundNumber ? Number.parseInt(String(roundNumber)) === initialRoundNumber : false;
  const isDoubles = matchUpType === 'DOUBLES';
  const link =
    ((searchActive || matchUp.isRoundRobin || matchUp.collectionId || params.isLucky || params.isAdHoc) && 'mr') ||
    (noProgression && 'noProgression') ||
    ((isQualifying || preFeedRound) && 'm0') ||
    (moiety && 'm1') ||
    'm2';

  const linkResult = getLinkStyle({ composition, isDoubles, roundFactor })({
    isFirstRound,
    link
  });
  const linkClass = linkResult.className;

  const configuration = composition?.configuration || {};
  const { centerInfo } = configuration || {};

  const eventHandlers = params.eventHandlers || {};
  const handleOnClick = (pointerEvent: MouseEvent) => {
    if (isFunction(eventHandlers?.matchUpClick)) {
      eventHandlers.matchUpClick({ pointerEvent, matchUp });
    }
  };

  const container = document.createElement('div');
  container.className = cx(composition?.theme, params?.className, 'matchup', matchUpContainerStyle());

  // event metadata
  container.classList.add('tmx-m');
  container.setAttribute('id', matchUp?.matchUpId);

  container.onclick = handleOnClick;

  const component = document.createElement('div');
  component.className = getMatchUpStyle({ configuration });

  const entryStatusDisplay = ({ sideNumber }: { sideNumber: number }) => {
    const entryStatus = matchUp?.sides
      ?.find((s) => s.sideNumber === sideNumber)
      ?.participant?.entryStatus?.replace('_', ' ');

    const className = sideNumber === 2 ? linkClass : undefined;

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
    // Apply link connector CSS custom properties to the element that has the link class
    if (s2.element) linkResult.applyStyles(s2.element);
    component.appendChild(s2.element);
  }
  component.appendChild(side2);
  // Apply link connector CSS custom properties to side2 (or side container with link class)
  if (!centerInfo) linkResult.applyStyles(side2);

  if (configuration?.matchUpFooter) {
    const footer = document.createElement('div');
    footer.className = 'chc-matchup-footer';
    const roundName = matchUp.roundName || '';
    const roundPosition = matchUp.roundPosition;
    const label = roundPosition ? `${roundName} \u2022 Match ${roundPosition}` : roundName;
    footer.textContent = label;
    component.appendChild(footer);
  }

  container.appendChild(component);

  if (selectedMatchUpId === matchUp.matchUpId) {
    const selected = document.createElement('div');
    selected.className = getSelectedMatchUpStyle();
    container.appendChild(selected);
  }

  return container;
}
