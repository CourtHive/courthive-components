import type { MatchUp } from '../../types';

/**
 * Configuration for `buildInteractiveScoringShell`.
 *
 * The shell is a mobile-first, full-page interactive scoring UI that
 * wraps a `ScoringEngine` (via the existing `InlineScoringManager`)
 * and presents two large point-entry buttons, a current score
 * display, and a control bar with undo/reset.
 *
 * The shell is stateful but emits a `stateChanged` CustomEvent on
 * every point so consumers (courthive-public for Phase 2) can
 * persist the current MatchUp to IndexedDB or any other store.
 *
 * Phase 2 targets standard tennis matchUpFormats. INTENNSE, pickleball,
 * and other formats are deferred to Phase 2.5+.
 */
export interface InteractiveScoringShellConfig {
  /** Unique matchUp id — used as the engine key and the persistence key. */
  matchUpId: string;
  /** matchUpFormat code, e.g. `'SET3-S:6/TB7'`. */
  matchUpFormat: string;
  /** Tournament id, for context display only (never sent anywhere). */
  tournamentId: string;
  /** Display name for side 1 (singles player or doubles pair). */
  side1Name: string;
  /** Display name for side 2. */
  side2Name: string;
  /**
   * Optional initial MatchUp to resume from — typically loaded from
   * IndexedDB. If omitted, the shell starts at 0-0.
   */
  initialMatchUp?: MatchUp;
}

/**
 * Detail payload for the `stateChanged` CustomEvent.
 */
export interface StateChangedDetail {
  matchUpId: string;
  matchUp: MatchUp;
  isComplete: boolean;
  winningSide?: number;
}

/**
 * Handle returned by `buildInteractiveScoringShell`. Consumers mount
 * `element` into the DOM, subscribe to state changes via
 * `addEventListener`, and call `destroy()` on unmount.
 */
export interface InteractiveScoringShell {
  /** The root DOM element for the scoring UI. Mount this into the page. */
  element: HTMLElement;
  /** Get the current MatchUp snapshot (for persistence). */
  getState(): MatchUp;
  /** Reset the scoring engine to 0-0. */
  reset(): void;
  /** Remove all listeners and release engine resources. */
  destroy(): void;
  /** Subscribe to state change events. */
  addEventListener(
    type: 'stateChanged',
    listener: (event: CustomEvent<StateChangedDetail>) => void,
  ): void;
  removeEventListener(
    type: 'stateChanged',
    listener: (event: CustomEvent<StateChangedDetail>) => void,
  ): void;
}
