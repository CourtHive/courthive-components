import { renderMatchUp } from '../renderStructure/renderMatchUp';
import { renderStatusPill } from '../renderStructure/renderStatusPill';
import type { InlineScoringManager } from './inlineScoringManager';
import type { Composition, EventHandlers, MatchUp } from '../../types';

const ACTIVE_CLASS = 'chc-inline-scoring-active';

interface RenderInlineMatchUpParams {
  matchUp: MatchUp;
  composition: Composition;
  manager: InlineScoringManager;
  matchUpFormat?: string;
  eventHandlers?: EventHandlers;
  isLucky?: boolean;
  isAdHoc?: boolean;
  className?: string;
}

/**
 * Renders a matchUp with inline scoring interactivity.
 * Sets up event handlers and configuration state, then delegates to `renderMatchUp`.
 * The footer buttons (Undo/Redo/Clear/Submit) are rendered by `renderMatchUp` itself,
 * driven by the inlineScoring config state and eventHandlers passed down.
 *
 * Returns a container element that re-renders itself after each scoring action.
 */
export function renderInlineMatchUp(params: RenderInlineMatchUpParams): HTMLElement {
  const { composition, manager, matchUpFormat, eventHandlers } = params;
  const inlineScoringConfig = composition?.configuration?.inlineScoring;
  const matchUpId = params.matchUp.matchUpId;
  const mode = inlineScoringConfig?.mode || 'points';

  // Get or create the engine for this matchUp
  const format = matchUpFormat || params.matchUp.matchUpFormat || 'SET3-S:6/TB7';
  manager.getOrCreate(matchUpId, format, params.matchUp);

  // Keep a mutable reference to the "base" matchUp (original data minus engine-derived score)
  let baseMatchUp = params.matchUp;

  // Outer wrapper that persists across re-renders
  // Outline lives here (not on the inner matchUp element) to avoid flash on re-render
  const wrapper = document.createElement('div');
  wrapper.className = 'chc-inline-scoring-wrapper';
  wrapper.setAttribute('data-matchup-id', matchUpId);
  wrapper.classList.add(ACTIVE_CLASS);

  function render() {
    wrapper.innerHTML = '';

    // Get engine-derived matchUp state
    const currentMatchUp = manager.getMatchUp(matchUpId, baseMatchUp);

    const isComplete = manager.isComplete(matchUpId);

    // Set runtime state on the inlineScoring config so renderMatchUp can use it
    const compositionWithState: Composition = {
      ...composition,
      configuration: {
        ...composition.configuration,
        inlineScoring: {
          ...inlineScoringConfig,
          canUndo: manager.canUndo(matchUpId),
          canRedo: manager.canRedo(matchUpId),
          isComplete,
        },
      },
    };

    // Build event handlers that route to manager
    const inlineEventHandlers: EventHandlers = {
      ...eventHandlers,
      scoreClick: ({ pointerEvent }) => {
        pointerEvent.stopPropagation();
      },
      scoreIncrement: ({ matchUpId: mId, sideNumber, scoreType }) => {
        if (manager.isComplete(mId)) return;
        // Disable scoring when an irregular ending status is active
        if (baseMatchUp.matchUpStatus && !['IN_PROGRESS', 'TO_BE_PLAYED'].includes(baseMatchUp.matchUpStatus)) return;
        const winner = (sideNumber - 1) as 0 | 1;
        let result: MatchUp | undefined;

        if (scoreType === 'point' || mode === 'points') {
          result = manager.addPoint(mId, winner, baseMatchUp);
        } else if (scoreType === 'game' || mode === 'games') {
          result = manager.addGame(mId, winner, baseMatchUp);
        }

        if (result) render();
      },
      pillClick: ({ pointerEvent, matchUp: mu, sideNumber }) => {
        pointerEvent.stopPropagation();
        const currentStatus = baseMatchUp.matchUpStatus;
        showEndMatchPopover(pointerEvent, mu.matchUpId, sideNumber, manager, currentStatus, (status) => {
          if (status === 'IN_PROGRESS') {
            // Resume scoring — restore to active state
            baseMatchUp = {
              ...baseMatchUp,
              matchUpStatus: 'IN_PROGRESS',
              winningSide: undefined,
              readyToScore: true,
            };
          } else {
            // For WALKOVER, clear the score
            if (status === 'WALKOVER') {
              manager.reset(matchUpId, baseMatchUp);
            }

            // sideNumber is the LOSING side — winner is the other
            const winningSide = sideNumber === 1 ? 2 : 1;

            baseMatchUp = {
              ...baseMatchUp,
              matchUpStatus: status,
              winningSide,
              readyToScore: false,
            };

            // Notify consumer
            manager.callbacks?.onEndMatch?.({
              matchUpId,
              matchUpStatus: status,
              sideNumber,
              engine: manager.get(matchUpId)?.engine,
            });
          }

          render();
        });
      },
      inlineUndo: () => {
        const result = manager.undo(matchUpId, baseMatchUp);
        if (result) render();
      },
      inlineRedo: () => {
        const result = manager.redo(matchUpId, baseMatchUp);
        if (result) render();
      },
      inlineClear: () => {
        manager.reset(matchUpId, baseMatchUp);
        // Also clear any irregular ending status, restoring to active scoring
        baseMatchUp = {
          ...baseMatchUp,
          matchUpStatus: 'IN_PROGRESS',
          winningSide: undefined,
          readyToScore: true,
        };
        render();
      },
      inlineSubmit: () => {
        const state = manager.get(matchUpId);
        if (state) {
          const matchUp = manager.getMatchUp(matchUpId, baseMatchUp);
          manager.callbacks?.onSubmit?.({ matchUpId, matchUp, engine: state.engine });
        }
      },
    };

    // Render the standard matchUp element — footer buttons are created by renderMatchUp
    const matchUpEl = renderMatchUp({
      ...params,
      composition: compositionWithState,
      matchUp: currentMatchUp,
      eventHandlers: inlineEventHandlers,
    });

    // Update wrapper outline: show when scoring is active, hide when complete
    if (isComplete) {
      wrapper.classList.remove(ACTIVE_CLASS);
    }

    wrapper.appendChild(matchUpEl);
  }

  render();
  return wrapper;
}

/**
 * Shows an end-match popover below the LIVE chip.
 * Uses renderStatusPill for each option so styling matches the Status stories exactly.
 * sideNumber indicates which side the pill was clicked on — for WO/RET/DEF the
 * clicked side is the losing side.
 */
function showEndMatchPopover(
  event: MouseEvent,
  matchUpId: string,
  sideNumber: number,
  manager: InlineScoringManager,
  currentStatus: string | undefined,
  onSelect: (status: string) => void,
) {
  // Remove any existing popover
  document.querySelectorAll('.chc-live-chip-popover').forEach((el) => el.remove());

  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  const popover = document.createElement('div');
  popover.className = 'chc-live-chip-popover';

  // Detect dark mode — popover is on document.body, outside theme scope
  const isDark = !!document.querySelector('[data-theme="dark"]');
  const bg = isDark ? '#222244' : '#fff';
  const border = isDark ? '#444' : '#dee2e6';
  const shadow = isDark
    ? '0 2px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(91,155,213,0.3)'
    : '0 2px 8px rgba(0,0,0,0.12)';

  // Side 1 (top): popover below the pill. Side 2 (bottom): popover above the pill.
  const verticalPos = sideNumber === 2
    ? `bottom: ${document.documentElement.clientHeight - rect.top + 4}px;`
    : `top: ${rect.bottom + 4}px;`;

  popover.style.cssText = `
    position: fixed;
    ${verticalPos}
    right: ${document.documentElement.clientWidth - rect.right}px;
    z-index: 1000;
    display: flex;
    gap: 0.3rem;
    padding: 0.35rem;
    background: ${bg};
    border: 1px solid ${border};
    border-radius: 6px;
    box-shadow: ${shadow};
  `;

  const hasIrregularStatus = currentStatus &&
    !['IN_PROGRESS', 'COMPLETED', 'TO_BE_PLAYED'].includes(currentStatus);

  // When an irregular status is active, offer LIVE (resume scoring) as the first option
  const statuses = hasIrregularStatus
    ? ['IN_PROGRESS', 'RETIRED', 'DEFAULTED', 'WALKOVER', 'SUSPENDED', 'CANCELLED', 'ABANDONED']
    : ['RETIRED', 'DEFAULTED', 'WALKOVER', 'SUSPENDED', 'CANCELLED', 'ABANDONED'];

  for (const status of statuses) {
    const pill = renderStatusPill({ matchUpStatus: status });
    pill.classList.add('chc-live-chip-popover-item');
    pill.onclick = (e) => {
      e.stopPropagation();
      popover.remove();
      document.removeEventListener('click', closeHandler);
      onSelect(status);
    };
    popover.appendChild(pill);
  }

  document.body.appendChild(popover);

  // Close on outside click
  const closeHandler = (e: MouseEvent) => {
    if (!popover.contains(e.target as Node)) {
      popover.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  // Defer to avoid immediate close from the same click
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}
