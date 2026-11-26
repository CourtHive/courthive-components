import { createTeamScoreOverride } from '../teamScoreOverrideState';
import { describe, expect, it } from 'vitest';

describe('team score override state', () => {
  it('the higher score wins; level scores wait for a chosen winner', () => {
    const state = createTeamScoreOverride({ side1Score: 2, side2Score: 1, winningSide: 1 });
    expect(state.isDirty()).toBe(false);
    expect(state.winnerAt()).toBe('left');

    state.setScore('right', 2);
    expect(state.needsWinner()).toBe(true);
    expect(state.isValid()).toBe(false);
    expect(state.winnerAt()).toBeUndefined();

    state.chooseWinner('right');
    // a winner on a level score is saved with how it was decided
    expect(state.needsDecision()).toBe(true);
    expect(state.isValid()).toBe(false);
    state.chooseMethod('OFFICIAL_DECISION');
    expect(state.isValid()).toBe(true);
    expect(state.value()).toEqual({
      side1Score: 2,
      side2Score: 2,
      winningSide: 2,
      decidedBy: { method: 'OFFICIAL_DECISION' }
    });

    // a decided score implies its winner, whatever was chosen while level
    state.setScore('right', 5);
    expect(state.value()).toEqual({ side1Score: 2, side2Score: 5, winningSide: 2 });
    state.setScore('left', 6);
    expect(state.value().winningSide).toBe(1);
  });

  it('positions map to sides through the swap', () => {
    const state = createTeamScoreOverride({ side1Score: 3, side2Score: 0, winningSide: 1, swapSides: true });
    expect(state.scoreAt('left')).toBe(0);
    expect(state.scoreAt('right')).toBe(3);
    expect(state.winnerAt()).toBe('right');

    state.setScore('left', 4);
    expect(state.value()).toEqual({ side1Score: 3, side2Score: 4, winningSide: 2 });
    expect(state.winnerAt()).toBe('left');
  });

  it('refuses a score that is not a whole number of 0 or more, and resets', () => {
    const state = createTeamScoreOverride({ side1Score: 1, side2Score: 0, winningSide: 1 });
    expect(state.setScore('left', -1)).toBe(false);
    expect(state.setScore('left', 1.5)).toBe(false);
    expect(state.setScore('left', Number.NaN)).toBe(false);
    expect(state.isDirty()).toBe(false);

    expect(state.setScore('left', 0)).toBe(true);
    state.chooseWinner('left');
    expect(state.isDirty()).toBe(true);
    state.reset();
    expect(state.value()).toEqual({ side1Score: 1, side2Score: 0, winningSide: 1 });
    expect(state.isDirty()).toBe(false);
  });

  it('an undecided level score starts unsaveable and keeps a level winner and decision it was given', () => {
    expect(createTeamScoreOverride({}).isValid()).toBe(false);
    const decidedBy = { method: 'SHOOTOUT' as const };
    const held = createTeamScoreOverride({ side1Score: 2, side2Score: 2, winningSide: 2, decidedBy });
    expect(held.winnerAt()).toBe('right');
    expect(held.methodChosen()).toBe('SHOOTOUT');
    expect(held.isValid()).toBe(true);
    expect(held.isDirty()).toBe(false);

    held.chooseMethod('LOTS');
    expect(held.isDirty()).toBe(true);
    held.reset();
    expect(held.methodChosen()).toBe('SHOOTOUT');
  });

  it('a score that decides the dual carries no decision', () => {
    const state = createTeamScoreOverride({ side1Score: 2, side2Score: 2, winningSide: 1 });
    state.chooseMethod('LOTS');
    state.setScore('left', 3);
    expect(state.needsDecision()).toBe(false);
    expect(state.methodChosen()).toBeUndefined();
    expect(state.isValid()).toBe(true);
    expect(state.value()).toEqual({ side1Score: 3, side2Score: 2, winningSide: 1 });
  });

  it('ignores a method the factory does not know', () => {
    const state = createTeamScoreOverride({ side1Score: 1, side2Score: 1, winningSide: 1 });
    state.chooseMethod('COIN' as any);
    expect(state.methodChosen()).toBeUndefined();
    expect(state.isValid()).toBe(false);
  });
});
