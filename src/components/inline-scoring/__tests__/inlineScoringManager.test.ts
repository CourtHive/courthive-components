import { describe, it, expect, vi } from 'vitest';
import { InlineScoringManager } from '../inlineScoringManager';
import type { MatchUp } from '../../../types';

const STANDARD_FORMAT = 'SET3-S:6/TB7';

function makeMatchUp(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    matchUpStatus: 'IN_PROGRESS',
    matchUpFormat: STANDARD_FORMAT,
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Player 1' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } },
    ],
    ...overrides,
  } as MatchUp;
}

describe('InlineScoringManager', () => {
  it('creates and retrieves engine state', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();

    const state = manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);
    expect(state).toBeDefined();
    expect(state.engine).toBeDefined();
    expect(state.matchUpFormat).toBe(STANDARD_FORMAT);
    expect(state.pointCount).toBe(0);
  });

  it('returns same engine on second getOrCreate call', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();

    const state1 = manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);
    const state2 = manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);
    expect(state1.engine).toBe(state2.engine);
  });

  it('has() returns correct values', () => {
    const manager = new InlineScoringManager();
    expect(manager.has('mu-1')).toBe(false);
    manager.getOrCreate('mu-1', STANDARD_FORMAT, makeMatchUp());
    expect(manager.has('mu-1')).toBe(true);
  });

  it('addPoint scores a point for side 1', () => {
    const onScoreChange = vi.fn();
    const manager = new InlineScoringManager({ onScoreChange });
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);

    const result = manager.addPoint('mu-1', 0, matchUp);
    expect(result).toBeDefined();
    expect(result!.score?.sets).toBeDefined();
    expect(onScoreChange).toHaveBeenCalledTimes(1);
    expect(onScoreChange.mock.calls[0][0].matchUpId).toBe('mu-1');
  });

  it('addPoint scores a point for side 2', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);

    const result = manager.addPoint('mu-1', 1, matchUp);
    expect(result).toBeDefined();
  });

  it('addGame increments game score', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);

    const result = manager.addGame('mu-1', 0, matchUp);
    expect(result).toBeDefined();
    const sets = result!.score?.sets || [];
    expect(sets.length).toBeGreaterThan(0);
    // After one game for side 1, set 1 should show 1-0
    expect(sets[0].side1Score).toBe(1);
    expect(sets[0].side2Score).toBe(0);
  });

  it('undo reverses last action', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);

    manager.addPoint('mu-1', 0, matchUp);
    expect(manager.canUndo('mu-1')).toBe(true);

    const result = manager.undo('mu-1', matchUp);
    expect(result).toBeDefined();
  });

  it('redo restores undone action', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);

    manager.addPoint('mu-1', 0, matchUp);
    manager.undo('mu-1', matchUp);
    expect(manager.canRedo('mu-1')).toBe(true);

    const result = manager.redo('mu-1', matchUp);
    expect(result).toBeDefined();
  });

  it('reset clears all scoring state', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);

    manager.addPoint('mu-1', 0, matchUp);
    manager.addPoint('mu-1', 1, matchUp);

    const result = manager.reset('mu-1', matchUp);
    expect(result).toBeDefined();
    expect(manager.canUndo('mu-1')).toBe(false);
  });

  it('isComplete returns false initially', () => {
    const manager = new InlineScoringManager();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, makeMatchUp());
    expect(manager.isComplete('mu-1')).toBe(false);
  });

  it('fires onMatchComplete when match finishes via games', () => {
    const onMatchComplete = vi.fn();
    const manager = new InlineScoringManager({ onMatchComplete });
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);

    // Play two full sets: 6-0, 6-0 via addGame
    for (let set = 0; set < 2; set++) {
      for (let game = 0; game < 6; game++) {
        manager.addGame('mu-1', 0, matchUp);
      }
    }

    expect(manager.isComplete('mu-1')).toBe(true);
    expect(onMatchComplete).toHaveBeenCalled();
    expect(onMatchComplete.mock.calls[0][0].winningSide).toBe(1);
  });

  it('remove deletes an engine', () => {
    const manager = new InlineScoringManager();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, makeMatchUp());
    expect(manager.has('mu-1')).toBe(true);
    manager.remove('mu-1');
    expect(manager.has('mu-1')).toBe(false);
  });

  it('clear removes all engines', () => {
    const manager = new InlineScoringManager();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, makeMatchUp());
    manager.getOrCreate('mu-2', STANDARD_FORMAT, makeMatchUp({ matchUpId: 'mu-2' }));
    manager.clear();
    expect(manager.has('mu-1')).toBe(false);
    expect(manager.has('mu-2')).toBe(false);
  });

  it('getSituation returns situation flags', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);

    // Score some points to get a situation
    manager.addPoint('mu-1', 0, matchUp);
    const situation = manager.getSituation('mu-1');
    expect(situation).toBeDefined();
  });

  it('getMatchUp returns engine-derived matchUp', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);

    manager.addPoint('mu-1', 0, matchUp);
    const result = manager.getMatchUp('mu-1', matchUp);
    expect(result.score).toBeDefined();
    expect(result.matchUpId).toBe('mu-1');
  });

  it('returns undefined for addPoint on non-existent engine', () => {
    const manager = new InlineScoringManager();
    const result = manager.addPoint('non-existent', 0, makeMatchUp());
    expect(result).toBeUndefined();
  });

  it('manages multiple independent engines', () => {
    const manager = new InlineScoringManager();
    const mu1 = makeMatchUp({ matchUpId: 'mu-1' });
    const mu2 = makeMatchUp({ matchUpId: 'mu-2' });

    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu1);
    manager.getOrCreate('mu-2', STANDARD_FORMAT, mu2);

    // Score differently
    manager.addGame('mu-1', 0, mu1);
    manager.addGame('mu-2', 1, mu2);

    const result1 = manager.getMatchUp('mu-1', mu1);
    const result2 = manager.getMatchUp('mu-2', mu2);

    expect(result1.score?.sets?.[0]?.side1Score).toBe(1);
    expect(result2.score?.sets?.[0]?.side2Score).toBe(1);
  });
});
