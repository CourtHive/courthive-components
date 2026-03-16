/**
 * Inline Scoring approach for the scoring modal.
 * Renders a matchUp with interactive point/game-by-game scoring
 * using InlineScoringManager and renderInlineMatchUp.
 */
import { renderInlineMatchUp } from '../../inline-scoring/renderInlineMatchUp';
import { InlineScoringManager } from '../../inline-scoring/inlineScoringManager';
import { compositions } from '../../../compositions/compositions';
import { getScoringConfig } from '../config';
import type { RenderScoreEntryParams, ScoreOutcome } from '../types';

export function renderInlineScoringEntry(params: RenderScoreEntryParams): void {
  const { matchUp, container, onScoreChange } = params;

  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '0.5em';

  const config = getScoringConfig();
  const compositionName = config.composition || 'Australian';
  const baseComposition = compositions[compositionName] || compositions.Australian;

  // Build a composition with inline scoring enabled
  const composition = {
    ...baseComposition,
    configuration: {
      ...baseComposition.configuration,
      matchUpFooter: true,
      inlineScoring: { mode: 'games' as const, showFooter: true, showSituation: true },
    },
  };

  const format = matchUp.matchUpFormat || 'SET3-S:6/TB7';

  // Prepare the matchUp for inline scoring
  const inlineMatchUp = {
    ...matchUp,
    matchUpStatus: 'IN_PROGRESS',
    readyToScore: true,
    winningSide: undefined,
  };

  const emitOutcome = (scoredMatchUp: any, isComplete: boolean) => {
    const sets = scoredMatchUp?.score?.sets || [];
    const outcome: ScoreOutcome = {
      isValid: isComplete || sets.some((s: any) => s.side1Score || s.side2Score),
      sets,
      winningSide: scoredMatchUp?.winningSide,
      matchUpStatus: scoredMatchUp?.matchUpStatus,
      matchUpFormat: format,
      score: scoredMatchUp?.score?.scoreStringSide1,
    };
    onScoreChange(outcome);
  };

  const manager = new InlineScoringManager({
    onScoreChange: ({ matchUpId: mId, matchUp: scoredMatchUp }) => {
      emitOutcome(scoredMatchUp, manager.isComplete(mId));
    },
    onMatchComplete: ({ matchUpId: mId }) => {
      const scoredMatchUp = manager.getMatchUp(mId, inlineMatchUp);
      emitOutcome(scoredMatchUp, true);
    },
    onEndMatch: ({ matchUpId: mId, matchUpStatus }) => {
      const scoredMatchUp = manager.getMatchUp(mId, inlineMatchUp);
      emitOutcome({ ...scoredMatchUp, matchUpStatus }, true);
    },
  });

  const inlineEl = renderInlineMatchUp({
    matchUp: inlineMatchUp,
    composition,
    manager,
    matchUpFormat: format,
    isLucky: true, // suppress connectors in modal context
  });

  container.appendChild(inlineEl);

  // Expose reset for the modal's Clear button
  (globalThis as any).resetInlineScoring = () => {
    manager.reset(matchUp.matchUpId, inlineMatchUp);
    // Re-render by replacing the content
    container.innerHTML = '';

    const freshMatchUp = {
      ...matchUp,
      matchUpStatus: 'IN_PROGRESS',
      readyToScore: true,
      winningSide: undefined,
    };

    const freshEl = renderInlineMatchUp({
      matchUp: freshMatchUp,
      composition,
      manager,
      matchUpFormat: format,
      isLucky: true,
    });
    container.appendChild(freshEl);

    onScoreChange({ isValid: false, sets: [], matchUpStatus: 'TO_BE_PLAYED' });
  };
}
