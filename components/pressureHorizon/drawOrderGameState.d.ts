import { DrawOrderScore } from './scoreDrawOrder';
export type DrawOrderGameState = {
    /** participantIds in true draw-position order — the answer key. */
    actualOrder: string[];
    /** participantIds in the player's current order. */
    order: string[];
    /** The seed that dealt this board; quoting it reproduces the puzzle exactly. */
    seed: number;
    /** False when the deal could not avoid leaving a row in its true slot. */
    deranged: boolean;
    revealed: boolean;
    /** Null until `revealDrawOrder`. */
    score: DrawOrderScore | null;
    /** Reorder operations the player has made on this board. */
    moves: number;
};
export declare function createDrawOrderGame({ actualOrder, seed }: {
    actualOrder: string[];
    seed: number;
}): DrawOrderGameState;
/**
 * Lift the row at `from` and drop it at `to`, closing the gap behind it.
 *
 * An out-of-range index returns the state untouched rather than throwing: a
 * pointer drag can legitimately end outside the list, and that is a no-op, not
 * an error. A revealed board is frozen — the answer is already on screen, so a
 * further move would produce a score that no longer describes what was guessed.
 */
export declare function moveSlot(state: DrawOrderGameState, from: number, to: number): DrawOrderGameState;
/** Exchange two rows in place — what a keyboard nudge does. */
export declare function swapSlots(state: DrawOrderGameState, a: number, b: number): DrawOrderGameState;
/** Score the board and freeze it. Repeated calls are idempotent. */
export declare function revealDrawOrder(state: DrawOrderGameState): DrawOrderGameState;
/** Deal a fresh board from a new seed, keeping the same field. */
export declare function reshuffleDrawOrder(state: DrawOrderGameState, seed: number): DrawOrderGameState;
