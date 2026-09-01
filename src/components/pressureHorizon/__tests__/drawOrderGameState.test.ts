import { describe, it, expect } from 'vitest';

import { createDrawOrderGame, reshuffleDrawOrder, revealDrawOrder, moveSlot, swapSlots } from '../drawOrderGameState';

const FIELD = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const SEED = 4242;

function game() {
  return createDrawOrderGame({ actualOrder: FIELD, seed: SEED });
}

describe('createDrawOrderGame', () => {
  it('deals a shuffled board over the same field', () => {
    const state = game();
    expect([...state.order].toSorted((a, b) => a.localeCompare(b, 'en'))).toEqual(FIELD);
    expect(state.order).not.toEqual(FIELD);
    expect(state.actualOrder).toEqual(FIELD);
    expect(state.revealed).toBe(false);
    expect(state.score).toBeNull();
    expect(state.moves).toBe(0);
  });

  it('does not alias the answer key to the board', () => {
    const state = moveSlot(game(), 0, 3);
    expect(state.actualOrder).toEqual(FIELD);
  });
});

describe('moveSlot', () => {
  it('lifts a row and closes the gap behind it', () => {
    const state = createDrawOrderGame({ actualOrder: FIELD, seed: SEED });
    const moved = moveSlot(state, 0, 2);
    const [first, ...rest] = state.order;
    expect(moved.order).toEqual([rest[0], rest[1], first, ...rest.slice(2)]);
    expect(moved.moves).toBe(1);
  });

  it('treats an out-of-range or no-op drop as nothing happening', () => {
    const state = game();
    expect(moveSlot(state, 2, 2)).toBe(state);
    expect(moveSlot(state, -1, 2)).toBe(state);
    expect(moveSlot(state, 0, 99)).toBe(state);
    expect(moveSlot(state, 1.5, 2)).toBe(state);
  });

  it('does not mutate the state it was given', () => {
    const state = game();
    const before = [...state.order];
    moveSlot(state, 0, 4);
    expect(state.order).toEqual(before);
  });
});

describe('swapSlots', () => {
  it('exchanges two rows in place', () => {
    const state = game();
    const swapped = swapSlots(state, 1, 2);
    expect(swapped.order[1]).toBe(state.order[2]);
    expect(swapped.order[2]).toBe(state.order[1]);
    expect(swapped.moves).toBe(1);
  });

  it('ignores a swap outside the board', () => {
    const state = game();
    expect(swapSlots(state, 0, 99)).toBe(state);
  });
});

describe('revealDrawOrder', () => {
  it('scores the board the player actually submitted', () => {
    const state = revealDrawOrder(game());
    expect(state.revealed).toBe(true);
    expect(state.score?.slots).toBe(FIELD.length);
    expect(state.score?.slotResults.map((result) => result.participantId)).toEqual(state.order);
  });

  it('is idempotent', () => {
    const revealed = revealDrawOrder(game());
    expect(revealDrawOrder(revealed)).toBe(revealed);
  });

  /**
   * A revealed board is frozen. Without this, a player could reveal, nudge a row
   * into place and re-score — and the number would describe a board that was
   * never guessed.
   */
  it('freezes the board — no move after the answer is on screen', () => {
    const revealed = revealDrawOrder(game());
    expect(moveSlot(revealed, 0, 3)).toBe(revealed);
    expect(swapSlots(revealed, 0, 3)).toBe(revealed);
  });

  it('scores a hand-solved board as perfect', () => {
    const solved = { ...game(), order: [...FIELD] };
    const revealed = revealDrawOrder(solved);
    expect(revealed.score?.perfect).toBe(true);
    expect(revealed.score?.structureScore).toBe(100);
  });
});

describe('reshuffleDrawOrder', () => {
  it('deals a fresh board over the same field and clears the score', () => {
    const revealed = revealDrawOrder(moveSlot(game(), 0, 1));
    const next = reshuffleDrawOrder(revealed, SEED + 1);
    expect(next.revealed).toBe(false);
    expect(next.score).toBeNull();
    expect(next.moves).toBe(0);
    expect(next.order).not.toEqual(revealed.order);
    expect(next.actualOrder).toEqual(FIELD);
  });
});
