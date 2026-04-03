import { getSelectedMatchUpStyle } from '../../styles/getSelectedMatchUpStyle';
import { matchUpContainerStyle } from '../../styles/matchUpContainerStyle';
import { getMatchUpStyle } from '../../styles/getMatchUpStyle';
import { drawDefinitionConstants } from 'tods-competition-factory';
import { renderCenterInfo } from './renderCenterInfo';
import { getLinkStyle } from '../../styles/getLinkStyle';
import { isFunction } from '../modal/cmodal';
import { renderSide } from './renderSide';
import cx from 'classnames';
import type { Composition, EventHandlers, MatchUp } from '../../types';

const { QUALIFYING } = drawDefinitionConstants;

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
  const isQualifying = stage === QUALIFYING && isFinalRound;

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
    const inlineScoring = configuration?.inlineScoring;

    // Show scoring buttons when inline scoring is active.
    // The runtime state (canUndo/canRedo/isComplete) is only set by renderInlineMatchUp,
    // so completed draw matchUps rendered normally won't get the footer.
    const hasBothSides = matchUp.sides?.length === 2 && matchUp.sides[0]?.participant && matchUp.sides[1]?.participant;
    const hasActiveSession =
      inlineScoring?.canUndo || inlineScoring?.canRedo || inlineScoring?.isComplete || inlineScoring?.isDirty;
    const isActiveScoringMatchUp =
      inlineScoring && inlineScoring.showFooter !== false && hasBothSides && (!matchUp.winningSide || hasActiveSession);

    if (isActiveScoringMatchUp) {
      footer.className = 'chc-matchup-footer chc-inline-scoring-footer-slot';
      // Round label on the left
      const roundLabel = document.createElement('span');
      roundLabel.className = 'chc-matchup-footer-round';
      const roundName = matchUp.roundName || '';
      const roundPosition = matchUp.roundPosition;
      roundLabel.textContent = roundPosition ? `${roundName} \u2022 M${roundPosition}` : roundName;
      footer.appendChild(roundLabel);

      // Buttons on the right — driven by eventHandlers
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'chc-inline-scoring-footer-buttons';

      const mkBtn = (label: string, cls: string, handler?: (params: { matchUpId: string }) => void) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.className = `chc-inline-scoring-btn ${cls}`;
        if (handler) {
          btn.onclick = (e) => {
            e.stopPropagation();
            handler({ matchUpId: matchUp.matchUpId });
          };
        }
        return btn;
      };

      const undoBtn = mkBtn('Undo', 'chc-is-undo', eventHandlers.inlineUndo);
      const redoBtn = mkBtn('Redo', 'chc-is-redo', eventHandlers.inlineRedo);
      const clearBtn = mkBtn('Clear', 'chc-is-clear', eventHandlers.inlineClear);
      const submitBtn = mkBtn('Submit', 'chc-is-submit', eventHandlers.inlineSubmit);

      undoBtn.disabled = !inlineScoring.canUndo;
      redoBtn.disabled = !inlineScoring.canRedo;
      clearBtn.disabled = !inlineScoring.canUndo && !inlineScoring.canRedo;
      submitBtn.disabled = !inlineScoring.isDirty;

      const buttonBar = document.createElement('div');
      buttonBar.className = 'chc-inline-scoring-buttons';
      buttonBar.append(undoBtn, redoBtn, clearBtn, submitBtn);
      buttonsContainer.appendChild(buttonBar);

      footer.appendChild(buttonsContainer);
    } else {
      footer.className = 'chc-matchup-footer';
      const roundName = matchUp.roundName || '';
      const roundPosition = matchUp.roundPosition;
      const label = roundPosition ? `${roundName} \u2022 Match ${roundPosition}` : roundName;
      footer.textContent = label;
    }
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
