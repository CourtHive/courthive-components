import { InteractiveScoringShellConfig, StateChangedDetail } from './types';
import { MatchUp } from '../../types';
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
export declare function createInteractiveScoringSession(config: InteractiveScoringShellConfig, { beforeNotify }?: {
    beforeNotify?: () => void;
}): InteractiveScoringSession;
export {};
