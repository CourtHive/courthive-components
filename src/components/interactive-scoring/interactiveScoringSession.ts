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
 * `beforeNotify` runs after an undo or reset and before its `stateChanged` goes out, so the shell has
 * re-rendered by the time a listener hears of it. (A point notifies from inside the engine call, before
 * the shell re-renders, as it always has.)
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

  const manager = new InlineScoringManager({
    onScoreChange: ({ matchUp }) => {
      dispatchStateChanged(matchUp, false);
    },
    onMatchComplete: ({ winningSide }) => {
      // Re-emit with the isComplete flag so persistence can stop listening
      dispatchStateChanged(getState(), true, winningSide);
    }
  });

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

  function reset(): void {
    manager.reset(matchUpId, baseMatchUp);
    beforeNotify?.();
    dispatchStateChanged(getState(), false);
  }

  return {
    point: (winner) => {
      if (manager.isComplete(matchUpId)) return false;
      return !!manager.addPoint(matchUpId, winner, baseMatchUp);
    },
    undo: () => {
      if (!manager.canUndo(matchUpId)) return false;
      manager.undo(matchUpId, baseMatchUp);
      beforeNotify?.();
      dispatchStateChanged(getState(), manager.isComplete(matchUpId));
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
