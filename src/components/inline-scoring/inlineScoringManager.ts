import { scoreGovernor } from 'tods-competition-factory';

const { ScoringEngine } = scoreGovernor;
import { engineToMatchUp } from './engineToMatchUp';
import type { MatchUp } from '../../types';
import type { InlineScoringCallbacks, InlineScoringEngineState } from './inlineScoringTypes';

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

    // If matchUp has existing score, load it via setInitialScore
    if (existingMatchUp?.score?.sets?.length) {
      try {
        engine.setInitialScore({
          sets: existingMatchUp.score.sets,
          matchUpStatus: existingMatchUp.matchUpStatus,
          winningSide: existingMatchUp.winningSide,
        } as any);
      } catch {
        // If initial score load fails, start fresh
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

    const server = (state.pointCount % 2) as 0 | 1;
    state.engine.addPoint({ winner, server, result: 'Winner' });
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

    state.engine.addGame({ winner });
    return this.notifyAndReturn(matchUpId, baseMatchUp);
  }

  /**
   * Add a set score. Used in 'entry' mode.
   */
  addSet(matchUpId: string, side1Score: number, side2Score: number, baseMatchUp: MatchUp): MatchUp | undefined {
    const state = this.engines.get(matchUpId);
    if (!state || state.engine.isComplete()) return undefined;

    state.engine.addSet({ side1Score, side2Score });
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
      const winner = state.engine.getWinner();
      if (winner != null) {
        // getWinner() returns 1-based side number (1 or 2)
        this.callbacks.onMatchComplete?.({ matchUpId, winningSide: winner, engine: state.engine });
      }
    }

    return updatedMatchUp;
  }
}
