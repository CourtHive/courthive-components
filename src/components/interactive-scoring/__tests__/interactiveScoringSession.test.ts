/**
 * The interactive scoring shell's rules without its DOM: config validation, the `stateChanged` listener
 * registry, point / undo / reset and the reset confirmation. What the shell renders from them, and what a
 * click on it does, is asserted in Chromium by `src/stories/InteractiveScoringShellTests.stories.ts`.
 * Moved from the retired happy-dom `buildInteractiveScoringShell.test.ts`.
 */
import { createInteractiveScoringSession } from '../interactiveScoringSession';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StateChangedDetail } from '../types';

const STANDARD_FORMAT = 'SET3-S:6/TB7';
const BASE_CONFIG = {
  matchUpId: 'mu-1',
  matchUpFormat: STANDARD_FORMAT,
  tournamentId: 'tour-1',
  side1Name: 'Alice',
  side2Name: 'Bob'
};

const lastSet = (session: ReturnType<typeof createInteractiveScoringSession>) =>
  session.getState().score?.sets?.at(-1) as any;

/** Every point to `winner` until the match is won; the count of points it took. */
function playOut(session: ReturnType<typeof createInteractiveScoringSession>, winner: 0 | 1 = 0): number {
  let points = 0;
  while (!session.isComplete() && points < 500) {
    session.point(winner);
    points += 1;
  }
  return points;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createInteractiveScoringSession', () => {
  it('throws without a matchUpId', () => {
    expect(() => createInteractiveScoringSession({ ...BASE_CONFIG, matchUpId: '' })).toThrow(/matchUpId/);
  });

  it('throws without a matchUpFormat', () => {
    expect(() => createInteractiveScoringSession({ ...BASE_CONFIG, matchUpFormat: '' })).toThrow(/matchUpFormat/);
  });

  it('starts at nothing played: the config’s matchUp, nothing to undo', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    const state = session.getState();
    expect(state.matchUpId).toBe('mu-1');
    expect(state.matchUpFormat).toBe(STANDARD_FORMAT);
    expect(state.score?.sets).toEqual([
      expect.objectContaining({
        setNumber: 1,
        side1Score: 0,
        side2Score: 0,
        side1PointScore: '0',
        side2PointScore: '0'
      })
    ]);
    expect(session.canUndo()).toBe(false);
    expect(session.isComplete()).toBe(false);
  });

  it('a point to side 1 is a 15-0 game, and undoable', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    expect(session.point(0)).toBe(true);
    expect(lastSet(session)).toMatchObject({ side1PointScore: '15', side2PointScore: '0' });
    expect(session.canUndo()).toBe(true);
  });

  it('undo takes back the last point only', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    session.point(0);
    session.point(0);
    expect(lastSet(session).side1PointScore).toBe('30');

    expect(session.undo()).toBe(true);
    expect(lastSet(session)).toMatchObject({ side1PointScore: '15', side2PointScore: '0' });
    session.undo();
    expect(session.canUndo()).toBe(false);
    expect(session.undo(), 'nothing left to undo').toBe(false);
  });

  it('plays a best-of-three to a straight-sets win (48 points), then takes no more', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    expect(playOut(session)).toBe(48);
    expect(session.getState().winningSide).toBe(1);
    expect(session.getState().score?.scoreStringSide1).toBe('6-0, 6-0');
    expect(session.point(0), 'a complete match takes no point').toBe(false);
    expect(session.point(1)).toBe(false);
  });

  it('reset goes back to nothing played', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    session.point(0);
    session.point(1);
    session.reset();
    expect(session.canUndo()).toBe(false);
    expect(session.getState().score?.sets).toEqual([
      expect.objectContaining({ side1Score: 0, side2Score: 0, side1PointScore: '0', side2PointScore: '0' })
    ]);
  });

  it('confirmAndReset resets only when confirmReset agrees, and awaits it', async () => {
    const refuse = vi.fn(async () => false);
    const refused = createInteractiveScoringSession({ ...BASE_CONFIG, confirmReset: refuse });
    refused.point(0);
    await expect(refused.confirmAndReset()).resolves.toBe(false);
    expect(refuse).toHaveBeenCalledTimes(1);
    expect(refused.canUndo(), 'reset was cancelled').toBe(true);

    const agreed = createInteractiveScoringSession({ ...BASE_CONFIG, confirmReset: () => true });
    agreed.point(0);
    await expect(agreed.confirmAndReset()).resolves.toBe(true);
    expect(agreed.canUndo()).toBe(false);

    const unasked = createInteractiveScoringSession(BASE_CONFIG);
    unasked.point(0);
    await expect(unasked.confirmAndReset(), 'no hook resets at once').resolves.toBe(true);
    expect(unasked.canUndo()).toBe(false);
  });
});

describe('stateChanged', () => {
  const details = (listener: ReturnType<typeof vi.fn>) =>
    listener.mock.calls.map(([event]) => (event as CustomEvent<StateChangedDetail>).detail);

  it('fires on every point with the matchUp, not complete', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    const listener = vi.fn();
    session.addListener(listener);
    session.point(0);
    session.point(0);
    session.point(1);

    expect(listener).toHaveBeenCalledTimes(3);
    const [first, , third] = details(listener);
    expect(first).toMatchObject({ matchUpId: 'mu-1', isComplete: false });
    expect((first.matchUp.score?.sets?.[0] as any).side1PointScore).toBe('15');
    expect((third.matchUp.score?.sets?.[0] as any).side2PointScore).toBe('15');
  });

  it('ends with isComplete and the winner on the winning point', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    const listener = vi.fn();
    session.addListener(listener);
    playOut(session, 1);

    const last = details(listener).at(-1)!;
    expect(last.isComplete).toBe(true);
    expect(last.winningSide).toBe(2);
    expect(details(listener).filter(({ isComplete }) => isComplete)).toHaveLength(1);
  });

  // The engine's own change notice goes out first, from inside the undo or reset; the session's second,
  // complete notice follows the shell's re-render, so a listener reading the page sees the new state.
  it('fires on undo and on reset, the last notice after the hook the shell renders in', () => {
    const order: string[] = [];
    const session = createInteractiveScoringSession(BASE_CONFIG, { beforeNotify: () => order.push('render') });
    session.addListener(() => order.push('notify'));
    session.point(0);
    order.length = 0;

    session.undo();
    session.reset();
    expect(order).toEqual(['notify', 'render', 'notify', 'notify', 'render', 'notify']);
  });

  it('a removed listener hears nothing', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    const listener = vi.fn();
    session.addListener(listener);
    session.removeListener(listener);
    session.point(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('a listener that throws is reported and does not stop the point or the other listeners', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const after = vi.fn();
    session.addListener(() => {
      throw new Error('listener boom');
    });
    session.addListener(after);

    expect(session.point(0)).toBe(true);
    expect(warn).toHaveBeenCalledWith('[interactive-scoring] listener threw', expect.any(Error));
    expect(after).toHaveBeenCalledTimes(1);
    expect(lastSet(session).side1PointScore).toBe('15');
  });

  it('destroy drops every listener', () => {
    const session = createInteractiveScoringSession(BASE_CONFIG);
    const listener = vi.fn();
    session.addListener(listener);
    session.destroy();
    session.reset();
    expect(listener).not.toHaveBeenCalled();
  });
});
