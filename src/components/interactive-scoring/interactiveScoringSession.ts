import { InlineScoringManager } from '../inline-scoring/inlineScoringManager';

// constants and types
import type { InteractiveScoringShellConfig, StateChangedDetail } from './types';
import type { MatchUp } from '../../types';

type StateChangedListener = (event: CustomEvent<StateChangedDetail>) => void;

/**
 * The scoring state behind `buildInteractiveScoringShell`, without its DOM: the engine (through
 * `InlineScoringManager`), the `stateChanged` listeners, and the point, undo and reset rules the shell's
 * buttons call. The shell renders this and re-renders after each call; it adds nothing to the rules.
 */
export interface InteractiveScoringSession {
  /** Award a point to side 1 (`0`) or side 2 (`1`). A complete match takes none. Reports whether one was taken. */
  point(winner: 0 | 1): boolean;
  /** Undo the last point when there is one. Reports whether anything was undone. */
  undo(): boolean;
  /** Back to the starting matchUp, unconditionally. */
  reset(): void;
  /** Reset after the consumer's `confirmReset` agrees, or at once without one. Resolves whether it reset. */
  confirmAndReset(): Promise<boolean>;
  getState(): MatchUp;
  isComplete(): boolean;
  canUndo(): boolean;
  addListener(listener: StateChangedListener): void;
  removeListener(listener: StateChangedListener): void;
  /** Drop every listener and release the engine. */
  destroy(): void;
}

/**
 * Every accepted point, undo and reset sends exactly ONE `stateChanged`, carrying the state after it:
 * `isComplete` and `winningSide` included, so the match-winning point is one notice, not a score notice
 * and a completion notice. `beforeNotify` runs first, so the shell has re-rendered by the time a listener
 * hears of it. A refused action (a point after the match, nothing to undo, a declined reset) sends none.
 */
export function createInteractiveScoringSession(
  config: InteractiveScoringShellConfig,
  { beforeNotify }: { beforeNotify?: () => void } = {}
): InteractiveScoringSession {
  if (!config?.matchUpId) {
    throw new Error('buildInteractiveScoringShell: matchUpId is required');
  }
  if (!config?.matchUpFormat) {
    throw new Error('buildInteractiveScoringShell: matchUpFormat is required');
  }

  const { matchUpId } = config;
  // Base matchUp — starts from the resume state if provided, else an empty shell
  const baseMatchUp: MatchUp = config.initialMatchUp ?? buildEmptyBaseMatchUp(config);
  const listeners = new Set<StateChangedListener>();

  // No engine callbacks: the manager would notify from inside each call, before the shell re-renders,
  // and a second time on completion. The session notifies once, after the action, in `settled`.
  const manager = new InlineScoringManager();

  // Initialize the engine with the resume state (or empty)
  manager.getOrCreate(matchUpId, config.matchUpFormat, baseMatchUp);

  function getState(): MatchUp {
    return manager.getMatchUp(matchUpId, baseMatchUp);
  }

  function dispatchStateChanged(matchUp: MatchUp, isComplete: boolean, winningSide?: number): void {
    const detail: StateChangedDetail = {
      matchUpId,
      matchUp,
      isComplete,
      winningSide: winningSide ?? matchUp.winningSide
    };
    const event = new CustomEvent<StateChangedDetail>('stateChanged', { detail });
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        // A consumer's listener throwing shouldn't break the shell
        console.warn('[interactive-scoring] listener threw', err);
      }
    });
  }

  /** After an accepted action: let the shell re-render, then tell the listeners, once. */
  function settled(): void {
    beforeNotify?.();
    const matchUp = getState();
    const isComplete = manager.isComplete(matchUpId);
    // A match can end level (a combined-point tie), so a complete matchUp need not carry a winningSide.
    const winner = isComplete ? manager.get(matchUpId)?.engine.getWinner() : undefined;
    dispatchStateChanged(matchUp, isComplete, winner ?? undefined);
  }

  function reset(): void {
    manager.reset(matchUpId, baseMatchUp);
    settled();
  }

  return {
    point: (winner) => {
      if (manager.isComplete(matchUpId)) return false;
      if (!manager.addPoint(matchUpId, winner, baseMatchUp)) return false;
      settled();
      return true;
    },
    undo: () => {
      if (!manager.canUndo(matchUpId)) return false;
      manager.undo(matchUpId, baseMatchUp);
      settled();
      return true;
    },
    reset,
    confirmAndReset: async () => {
      if (config.confirmReset) {
        const confirmed = await config.confirmReset();
        if (!confirmed) return false;
      }
      reset();
      return true;
    },
    getState,
    isComplete: () => manager.isComplete(matchUpId),
    canUndo: () => manager.canUndo(matchUpId),
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    destroy: () => {
      listeners.clear();
      manager.remove(matchUpId);
    }
  };
}

function buildEmptyBaseMatchUp(config: InteractiveScoringShellConfig): MatchUp {
  return {
    matchUpId: config.matchUpId,
    tournamentId: config.tournamentId,
    matchUpFormat: config.matchUpFormat,
    matchUpStatus: 'TO_BE_PLAYED',
    score: { sets: [] },
    sides: [
      { sideNumber: 1, participant: { participantName: config.side1Name } },
      { sideNumber: 2, participant: { participantName: config.side2Name } }
    ]
  } as unknown as MatchUp;
}
