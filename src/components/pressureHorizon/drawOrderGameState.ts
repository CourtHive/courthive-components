/**
 * Draw-order game — pure state.
 *
 * Every decision the game makes lives here rather than in the DOM layer, because
 * courthive-components proves DOM behaviour with Storybook play functions
 * (Playwright) and proves decisions with vitest. A reducer that a unit test can
 * drive is the only way the reorder and reveal rules get real coverage; if the
 * rules lived inside drag handlers they would be described in comments and
 * asserted nowhere.
 *
 * The state never contains a hint. `order` is the player's board and
 * `actualOrder` is the answer key — the renderer is expected to read `order`
 * only, and to touch `actualOrder` after `revealDrawOrder` has been called.
 */

import { shuffleDeranged } from './shuffleWithSeed';
import { scoreDrawOrder } from './scoreDrawOrder';

// constants and types
import type { DrawOrderScore } from './scoreDrawOrder';

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

export function createDrawOrderGame({
  actualOrder,
  seed
}: {
  actualOrder: string[];
  seed: number;
}): DrawOrderGameState {
  const dealt = shuffleDeranged(actualOrder, seed);
  return {
    actualOrder: [...actualOrder],
    order: dealt.items,
    seed: dealt.seed,
    deranged: dealt.deranged,
    revealed: false,
    score: null,
    moves: 0
  };
}

function inRange(state: DrawOrderGameState, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < state.order.length;
}

/**
 * Lift the row at `from` and drop it at `to`, closing the gap behind it.
 *
 * An out-of-range index returns the state untouched rather than throwing: a
 * pointer drag can legitimately end outside the list, and that is a no-op, not
 * an error. A revealed board is frozen — the answer is already on screen, so a
 * further move would produce a score that no longer describes what was guessed.
 */
export function moveSlot(state: DrawOrderGameState, from: number, to: number): DrawOrderGameState {
  if (state.revealed || from === to || !inRange(state, from) || !inRange(state, to)) return state;
  const order = [...state.order];
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  return { ...state, order, moves: state.moves + 1 };
}

/** Exchange two rows in place — what a keyboard nudge does. */
export function swapSlots(state: DrawOrderGameState, a: number, b: number): DrawOrderGameState {
  if (state.revealed || a === b || !inRange(state, a) || !inRange(state, b)) return state;
  const order = [...state.order];
  [order[a], order[b]] = [order[b], order[a]];
  return { ...state, order, moves: state.moves + 1 };
}

/** Score the board and freeze it. Repeated calls are idempotent. */
export function revealDrawOrder(state: DrawOrderGameState): DrawOrderGameState {
  if (state.revealed) return state;
  return {
    ...state,
    revealed: true,
    score: scoreDrawOrder({ guess: state.order, actual: state.actualOrder })
  };
}

/** Deal a fresh board from a new seed, keeping the same field. */
export function reshuffleDrawOrder(state: DrawOrderGameState, seed: number): DrawOrderGameState {
  return createDrawOrderGame({ actualOrder: state.actualOrder, seed });
}
