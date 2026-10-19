import { scoreGovernor } from 'tods-competition-factory';
import { engineToMatchUp } from './engineToMatchUp';

// constants and types
import type { InlineScoringCallbacks, InlineScoringEngineState } from './inlineScoringTypes';
import type { MatchUp } from '../../types';

const { ScoringEngine } = scoreGovernor;

/**
 * Manages ScoringEngine instances for inline scoring in draw brackets.
 * One engine per matchUpId; lazily created on first interaction.
 */
export class InlineScoringManager {
  private engines: Map<string, InlineScoringEngineState> = new Map();
  readonly callbacks: InlineScoringCallbacks;

  constructor(callbacks?: InlineScoringCallbacks) {
    this.callbacks = callbacks || {};
  }

  /**
   * Get or create a ScoringEngine for a matchUp.
   * If the matchUp has existing score data, initializes the engine with it.
   */
  getOrCreate(matchUpId: string, matchUpFormat: string, existingMatchUp?: MatchUp): InlineScoringEngineState {
    let state = this.engines.get(matchUpId);
    if (state) return state;

    const engine = new ScoringEngine({ matchUpFormat });

    // If matchUp has existing score, load it via setInitialScore.
    // Split sets into completed (with winningSide) and the current in-progress set.
    // The current set must be passed as currentSetScore so the engine creates it
    // with internal tracking arrays (side1GameScores/side2GameScores) that addPoint needs.
    if (existingMatchUp?.score?.sets?.length) {
      try {
        const allSets = existingMatchUp.score.sets;
        const completedSets = allSets.filter((s: any) => s.winningSide);
        const currentSet = allSets.find((s: any) => !s.winningSide);

        // Convert tennis display point scores ("15","30","40","AD") to raw point counts
        // so the engine can resume mid-game state
        let currentGameScore: { side1Points: number; side2Points: number } | undefined;
        if (currentSet?.side1PointScore != null && currentSet?.side2PointScore != null) {
          const toRaw = (display: string | number): number => {
            const s = String(display);
            if (s === '0') return 0;
            if (s === '15') return 1;
            if (s === '30') return 2;
            if (s === '40') return 3;
            if (s === 'AD') return 4;
            const n = Number(display);
            return isNaN(n) ? 0 : n;
          };
          currentGameScore = {
            side1Points: toRaw(currentSet.side1PointScore),
            side2Points: toRaw(currentSet.side2PointScore)
          };
        }

        engine.setInitialScore({
          sets: completedSets,
          ...(currentSet && {
            currentSetScore: {
              side1Score: currentSet.side1Score || 0,
              side2Score: currentSet.side2Score || 0
            }
          }),
          ...(currentGameScore && { currentGameScore }),
          matchUpStatus: existingMatchUp.matchUpStatus,
          winningSide: existingMatchUp.winningSide
        } as any);
      } catch {
        // A baseline the factory refuses starts fresh: one whose matchUpStatus or winningSide disagrees with
        // the sets (IN_PROGRESS beside sets that decide the match, COMPLETED beside sets that do not). The
        // engine is untouched, so engineToMatchUp shows the persisted score until the first input.
      }
    }

    state = { engine, matchUpFormat, pointCount: 0 };
    this.engines.set(matchUpId, state);
    return state;
  }

  get(matchUpId: string): InlineScoringEngineState | undefined {
    return this.engines.get(matchUpId);
  }

  has(matchUpId: string): boolean {
    return this.engines.has(matchUpId);
  }

  /**
   * Add a point for a side. Used in 'points' mode.
   * @param winner - 0 for side 1, 1 for side 2
   */
  addPoint(matchUpId: string, winner: 0 | 1, baseMatchUp: MatchUp): MatchUp | undefined {
    const state = this.engines.get(matchUpId);
    if (!state || state.engine.isComplete()) return undefined;
    // a segment of outs takes set totals: the engine refuses a point there rather than scoring it as tennis
    if (!this.accepts(matchUpId, 'point')) return undefined;

    // The engine derives who served: in tennis the server changes game by game, not point by point.
    // Supplying `pointCount % 2` alternated it every point and recorded that as the observed server.
    // Only the point's winner is known here: a stroke result would count in statistics as a winner hit.
    state.engine.addPoint({ winner });
    state.pointCount++;

    return this.notifyAndReturn(matchUpId, baseMatchUp);
  }

  /**
   * Add a game for a side. Used in 'games' mode.
   * @param winner - 0 for side 1, 1 for side 2
   */
  addGame(matchUpId: string, winner: 0 | 1, baseMatchUp: MatchUp): MatchUp | undefined {
    const state = this.engines.get(matchUpId);
    if (!state || state.engine.isComplete()) return undefined;
    if (!this.accepts(matchUpId, 'game')) return undefined;

    state.engine.addGame({ winner });
    return this.notifyAndReturn(matchUpId, baseMatchUp);
  }

  /**
   * Add a set score. Used in 'entry' mode.
   *
   * The factory judges the total by its segment's rule and refuses a total that is not a fact (a negative
   * or non-integer score): that refusal records nothing and returns undefined, as input on a completed
   * match does. An input the engine ignores (`recorded: false`) returns undefined too.
   */
  addSet(matchUpId: string, side1Score: number, side2Score: number, baseMatchUp: MatchUp): MatchUp | undefined {
    const state = this.engines.get(matchUpId);
    if (!state || state.engine.isComplete()) return undefined;

    try {
      const result = state.engine.addSet({ side1Score, side2Score });
      if (result?.recorded === false) return undefined;
    } catch {
      // a refused total records nothing: the score is as it was
      return undefined;
    }
    return this.notifyAndReturn(matchUpId, baseMatchUp);
  }

  undo(matchUpId: string, baseMatchUp: MatchUp): MatchUp | undefined {
    const state = this.engines.get(matchUpId);
    if (!state || !state.engine.canUndo()) return undefined;

    state.engine.undo();
    if (state.pointCount > 0) state.pointCount--;
    return this.notifyAndReturn(matchUpId, baseMatchUp);
  }

  redo(matchUpId: string, baseMatchUp: MatchUp): MatchUp | undefined {
    const state = this.engines.get(matchUpId);
    if (!state || !state.engine.canRedo()) return undefined;

    state.engine.redo();
    state.pointCount++;
    return this.notifyAndReturn(matchUpId, baseMatchUp);
  }

  reset(matchUpId: string, baseMatchUp: MatchUp): MatchUp | undefined {
    const state = this.engines.get(matchUpId);
    if (!state) return undefined;

    state.engine.reset();
    state.pointCount = 0;
    return this.notifyAndReturn(matchUpId, baseMatchUp);
  }

  /**
   * Get the current engine-derived matchUp data.
   */
  getMatchUp(matchUpId: string, baseMatchUp: MatchUp): MatchUp {
    const state = this.engines.get(matchUpId);
    if (!state) return baseMatchUp;
    return engineToMatchUp(state.engine, baseMatchUp);
  }

  /**
   * Get situation flags (break point, set point, etc.) for display.
   */
  getSituation(matchUpId: string): Record<string, boolean> | undefined {
    const state = this.engines.get(matchUpId);
    if (!state) return undefined;
    return state.engine.getScore()?.situation;
  }

  canUndo(matchUpId: string): boolean {
    return this.engines.get(matchUpId)?.engine.canUndo() ?? false;
  }

  canRedo(matchUpId: string): boolean {
    return this.engines.get(matchUpId)?.engine.canRedo() ?? false;
  }

  isComplete(matchUpId: string): boolean {
    return this.engines.get(matchUpId)?.engine.isComplete() ?? false;
  }

  /**
   * Whether the set in play takes this input. The factory reports what each segment can be scored with
   * (`getInputLevels`): a segment of outs takes set totals only, a combined-point total has no games.
   */
  accepts(matchUpId: string, level: 'point' | 'game'): boolean {
    const engine = this.engines.get(matchUpId)?.engine;
    if (!engine) return false;
    // a factory before getInputLevels accepts every input, as it always did
    if (typeof engine.getInputLevels !== 'function') return true;
    return !!engine.getInputLevels()[level];
  }

  remove(matchUpId: string): void {
    this.engines.delete(matchUpId);
  }

  clear(): void {
    this.engines.clear();
  }

  private notifyAndReturn(matchUpId: string, baseMatchUp: MatchUp): MatchUp {
    const state = this.engines.get(matchUpId)!;
    const updatedMatchUp = engineToMatchUp(state.engine, baseMatchUp);

    this.callbacks.onScoreChange?.({ matchUpId, matchUp: updatedMatchUp, engine: state.engine });

    if (state.engine.isComplete()) {
      // getWinner() returns 1-based side number (1 or 2), or nothing for a match that ended level: a
      // combined-point total (16-16 of SET1-S:P32, CA 2026-10-11), and since factory 7.16 an exactly or
      // aggregate count closed level with no declared decider (HAL2X-S:TB11 at one half each). A tie is a
      // finished result too: listeners must not assume a winningSide.
      const winner = state.engine.getWinner();
      this.callbacks.onMatchComplete?.({ matchUpId, winningSide: winner ?? undefined, engine: state.engine });
    }

    return updatedMatchUp;
  }
}
