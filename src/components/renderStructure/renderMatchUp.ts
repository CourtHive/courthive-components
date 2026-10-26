import { getSelectedMatchUpStyle } from '../../styles/getSelectedMatchUpStyle';
import { matchUpContainerStyle } from '../../styles/matchUpContainerStyle';
import { getMatchUpStyle } from '../../styles/getMatchUpStyle';
import { renderMatchUpActions } from './renderMatchUpActions';
import { renderCenterInfo } from './renderCenterInfo';
import { hasVideo } from './renderOnlineResources';
import { renderSlot } from './renderSlot';
import { upsetOf } from './matchUpState';
import { isFunction } from '../modal/cmodal';
import { renderSide } from './renderSide';
import cx from 'classnames';
import type { Composition, Configuration, EventHandlers, MatchUp } from '../../types';

export function renderMatchUp(params: {
  composition?: Composition;
  initialRoundNumber?: number;
  matchUp: MatchUp;
  /**
   * @deprecated The connector is drawn by the cell `renderRound` puts the matchUp in, so a matchUp no longer
   * needs to know whether it is the upper or lower of a pair. Ignored.
   */
  moiety?: boolean;
  selectedMatchUpId?: string;
  searchActive?: boolean;
  isFinalRound?: boolean;
  isLucky?: boolean;
  isAdHoc?: boolean;
  eventHandlers?: EventHandlers;
  className?: string;
  /**
   * @deprecated Connector heights are no longer computed: a round is a grid of equal rows and the connector is
   * drawn as percentages of its cell. Ignored.
   */
  roundFactor?: number;
}): HTMLElement {
  const { composition, initialRoundNumber = 1, matchUp, selectedMatchUpId } = params;

  const configuration = composition?.configuration || {};
  const { centerInfo } = configuration || {};

  const eventHandlers = params.eventHandlers || {};
  const handleOnClick = (pointerEvent: MouseEvent) => {
    if (isFunction(eventHandlers?.matchUpClick)) {
      eventHandlers.matchUpClick({ pointerEvent, matchUp });
    }
  };

  const container = document.createElement('div');
  container.className = cx(
    composition?.theme,
    params?.className,
    'matchup',
    matchUpContainerStyle(),
    configuration.rounded && 'chc-rounded',
    configuration.density === 'compact' && 'chc-density--compact'
  );

  // event metadata
  container.classList.add('tmx-m');
  container.setAttribute('id', matchUp?.matchUpId);
  // a fact about the matchUp, set whether or not configuration.onlineResources shows the icon
  if (hasVideo(matchUp)) container.dataset.hasVideo = 'true';
  if (upsetOf(matchUp)) container.dataset.upset = 'true';
  // state a host can style without post-render DOM passes
  if (matchUp.matchUpStatus) container.dataset.matchupStatus = matchUp.matchUpStatus;
  if (matchUp.matchUpStatus === 'IN_PROGRESS') container.dataset.live = 'true';
  recordRenderParams(container, params);

  container.onclick = handleOnClick;

  const component = document.createElement('div');
  component.className = getMatchUpStyle({ configuration });

  const entryStatusDisplay = ({ sideNumber }: { sideNumber: number }) => {
    const entryStatus = matchUp?.sides
      ?.find((s) => s.sideNumber === sideNumber)
      ?.participant?.entryStatus?.replace('_', ' ');

    return renderCenterInfo({
      eventHandlers,
      entryStatus,
      sideNumber,
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

  const footer = renderFooter({ configuration, eventHandlers, matchUp });
  if (footer) component.appendChild(footer);

  // configuration.matchUpActions: Watch and Share under the card
  const actions = renderMatchUpActions({ configuration, eventHandlers, matchUp });
  if (actions) component.appendChild(actions);

  container.appendChild(component);

  if (selectedMatchUpId === matchUp.matchUpId) {
    const selected = document.createElement('div');
    selected.className = getSelectedMatchUpStyle();
    container.appendChild(selected);
  }

  return container;
}

/**
 * The card's footer: the inline-scoring buttons while a matchUp is being scored inline, otherwise the round
 * label, or what `renderers.matchUpFooter` renders in its place. Undefined when there is no footer.
 */
function renderFooter({
  configuration,
  eventHandlers,
  matchUp
}: {
  configuration: Configuration;
  eventHandlers: EventHandlers;
  matchUp: MatchUp;
}): HTMLElement | undefined {
  const footerSlot = renderSlot(configuration.renderers, 'matchUpFooter', { matchUp }, 'div');
  if (!configuration?.matchUpFooter && !footerSlot) return undefined;
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

  if (configuration?.matchUpFooter && isActiveScoringMatchUp) {
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
    // renderers.matchUpFooter replaces the round label
    if (footerSlot) footer.appendChild(footerSlot);
    else footer.textContent = label;
  }
  return footer;
}

/**
 * This render's place in its structure, recorded on `.tmx-m` so `renderMatchUpInPlace` can re-render the
 * matchUp alone exactly as the structure did: the view's first round decides which draw positions show, and
 * the flags shape the card. The connector belongs to the cell around the card, which an in-place swap keeps.
 * Flags are written only when set.
 */
function recordRenderParams(container: HTMLElement, params: Parameters<typeof renderMatchUp>[0]): void {
  const { dataset } = container;
  if (params.initialRoundNumber !== undefined) dataset.initialRound = String(params.initialRoundNumber);
  if (params.isFinalRound) dataset.finalRound = 'true';
  if (params.isLucky) dataset.lucky = 'true';
  if (params.isAdHoc) dataset.adHoc = 'true';
  if (params.searchActive) dataset.searchActive = 'true';
}
