import { renderMatchUp } from '../renderStructure/renderMatchUp';
import { createInlineScoringFooter } from './inlineScoringFooter';
import { createEntryFields } from './inlineScoringEntry';
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
 * Wraps the standard `renderMatchUp` and adds:
 * - Click-on-score cells to add points/games (based on inlineScoring.mode)
 * - Interactive footer with Undo/Redo/Clear/End buttons
 * - Situation flags display (optional)
 *
 * Returns a container element that re-renders itself after each scoring action.
 */
export function renderInlineMatchUp(params: RenderInlineMatchUpParams): HTMLElement {
  const { composition, manager, matchUpFormat, eventHandlers } = params;
  const inlineScoringConfig = composition?.configuration?.inlineScoring;
  const matchUpId = params.matchUp.matchUpId;
  const mode = inlineScoringConfig?.mode || 'points';
  const showFooter = inlineScoringConfig?.showFooter !== false;
  const showSituation = inlineScoringConfig?.showSituation !== false;

  // Get or create the engine for this matchUp
  const format = matchUpFormat || params.matchUp.matchUpFormat || 'SET3-S:6/TB7';
  manager.getOrCreate(matchUpId, format, params.matchUp);

  // Keep a mutable reference to the "base" matchUp (original data minus engine-derived score)
  let baseMatchUp = params.matchUp;

  // Outer wrapper that persists across re-renders
  const wrapper = document.createElement('div');
  wrapper.className = 'chc-inline-scoring-wrapper';
  wrapper.setAttribute('data-matchup-id', matchUpId);

  let footerInstance: ReturnType<typeof createInlineScoringFooter> | undefined;

  function render() {
    wrapper.innerHTML = '';

    // Get engine-derived matchUp state
    const currentMatchUp = manager.getMatchUp(matchUpId, baseMatchUp);

    // Render the standard matchUp element
    const matchUpEl = renderMatchUp({
      ...params,
      matchUp: currentMatchUp,
      eventHandlers: {
        ...eventHandlers,
        // Override scoreClick to handle inline scoring
        scoreClick: ({ pointerEvent, matchUp: _mu }) => {
          pointerEvent.stopPropagation();
          // In game/point modes, clicking score area does nothing special
          // — scoring happens via side clicks
        },
      },
    });

    // Add click zones for scoring on each side
    if (!manager.isComplete(matchUpId)) {
      if (mode === 'entry') {
        // Entry mode: render input fields below the matchUp
        const entryEl = createEntryFields({
          matchUpId,
          manager,
          baseMatchUp,
          onUpdate: () => render(),
        });
        matchUpEl.classList.add(ACTIVE_CLASS);
        wrapper.appendChild(matchUpEl);
        wrapper.appendChild(entryEl);
      } else {
        addSideClickHandlers(matchUpEl, matchUpId, mode, baseMatchUp, manager, () => {
          render();
        });
        matchUpEl.classList.add(ACTIVE_CLASS);
        wrapper.appendChild(matchUpEl);
      }
    } else {
      matchUpEl.classList.add(ACTIVE_CLASS);
      wrapper.appendChild(matchUpEl);
    }

    // Footer
    if (showFooter) {
      if (!footerInstance) {
        footerInstance = createInlineScoringFooter({
          matchUpId,
          manager,
          baseMatchUp,
          showSituation,
          onUpdate: () => render(),
        });
      } else {
        footerInstance.update();
      }
      wrapper.appendChild(footerInstance.element);
    }
  }

  render();
  return wrapper;
}

/**
 * Adds transparent click overlays to each side's score area.
 * - In 'points' mode: click side → addPoint(winner)
 * - In 'games' mode: click side → addGame(winner)
 * - In 'entry' mode: no click overlays (user uses input fields)
 */
function addSideClickHandlers(
  matchUpEl: HTMLElement,
  matchUpId: string,
  mode: string,
  baseMatchUp: MatchUp,
  manager: InlineScoringManager,
  onUpdate: () => void,
) {
  if (mode === 'entry') return;

  const scoreAreas = matchUpEl.querySelectorAll('.sideScore');
  scoreAreas.forEach((scoreArea, index) => {
    const sideNumber = index + 1;
    const winner = (sideNumber - 1) as 0 | 1;

    // Make the score area visually clickable
    (scoreArea as HTMLElement).classList.add('chc-inline-scoring-clickable');
    (scoreArea as HTMLElement).style.cursor = 'pointer';

    // Add click handler
    (scoreArea as HTMLElement).addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      let result: MatchUp | undefined;
      if (mode === 'points') {
        result = manager.addPoint(matchUpId, winner, baseMatchUp);
      } else if (mode === 'games') {
        result = manager.addGame(matchUpId, winner, baseMatchUp);
      }

      if (result) {
        onUpdate();
      }
    });
  });

  // Also add click handlers on participant areas as scoring targets
  const sides = matchUpEl.querySelectorAll('.tmx-sd');
  sides.forEach((sideEl, index) => {
    const winner = index as 0 | 1;
    (sideEl as HTMLElement).classList.add('chc-inline-scoring-side');
    (sideEl as HTMLElement).addEventListener('click', (e) => {
      // Only score if clicking on the participant name area (not score)
      if ((e.target as HTMLElement).closest('.sideScore')) return;

      e.stopPropagation();

      let result: MatchUp | undefined;
      if (mode === 'points') {
        result = manager.addPoint(matchUpId, winner, baseMatchUp);
      } else if (mode === 'games') {
        result = manager.addGame(matchUpId, winner, baseMatchUp);
      }

      if (result) {
        onUpdate();
      }
    });
  });
}
