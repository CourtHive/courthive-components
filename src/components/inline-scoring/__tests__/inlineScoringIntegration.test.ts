/**
 * Integration tests: InlineScoringManager + engineToMatchUp end-to-end flows
 */
import { describe, it, expect, vi } from 'vitest';
import { InlineScoringManager } from '../inlineScoringManager';
import { engineToMatchUp } from '../engineToMatchUp';
import { scoreGovernor } from 'tods-competition-factory';
import type { MatchUp } from '../../../types';

const { ScoringEngine } = scoreGovernor;
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

describe('Integration: full game flow via addPoint', () => {
  it('scores a full game (4 points) and advances game count', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    // 4 points for side 1 = 1 game
    for (let i = 0; i < 4; i++) {
      manager.addPoint('mu-1', 0, mu);
    }

    const result = manager.getMatchUp('mu-1', mu);
    const sets = result.score?.sets || [];
    expect(sets.length).toBeGreaterThan(0);
    expect(sets[0].side1Score).toBe(1);
    expect(sets[0].side2Score).toBe(0);
  });

  it('scores a full set (6-0) via addGame', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    // Use addGame for deterministic set completion
    for (let g = 0; g < 6; g++) {
      manager.addGame('mu-1', 0, mu);
    }

    const result = manager.getMatchUp('mu-1', mu);
    const sets = result.score?.sets || [];
    expect(sets.length).toBeGreaterThanOrEqual(1);
    expect(sets[0].winningSide).toBe(1);
    expect(sets[0].side1Score).toBe(6);
    expect(sets[0].side2Score).toBe(0);

    // Match should not be complete (need 2 sets)
    expect(manager.isComplete('mu-1')).toBe(false);

    // Adding a game in set 2 should work
    manager.addGame('mu-1', 1, mu);
    const result2 = manager.getMatchUp('mu-1', mu);
    const sets2 = result2.score?.sets || [];
    expect(sets2.length).toBeGreaterThanOrEqual(2);
    expect(sets2[1].side2Score).toBe(1);
  });

  it('completes a full match (6-0, 6-0) via addPoint', () => {
    const onMatchComplete = vi.fn();
    const manager = new InlineScoringManager({ onMatchComplete });
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    // Two sets of 6-0 = 48 points
    for (let set = 0; set < 2; set++) {
      for (let g = 0; g < 6; g++) {
        for (let p = 0; p < 4; p++) {
          manager.addPoint('mu-1', 0, mu);
        }
      }
    }

    expect(manager.isComplete('mu-1')).toBe(true);
    expect(onMatchComplete).toHaveBeenCalled();
    expect(onMatchComplete.mock.calls[0][0].winningSide).toBe(1);
  });
});

describe('Integration: full game flow via addGame', () => {
  it('completes a 6-4, 6-3 match', () => {
    const onMatchComplete = vi.fn();
    const manager = new InlineScoringManager({ onMatchComplete });
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    // Set 1: 6-4
    for (let i = 0; i < 6; i++) manager.addGame('mu-1', 0, mu);
    for (let i = 0; i < 4; i++) manager.addGame('mu-1', 1, mu);

    // Set 1 should be complete
    const mid = manager.getMatchUp('mu-1', mu);
    expect(mid.score?.sets?.[0]?.winningSide).toBe(1);

    // Set 2: 6-3
    for (let i = 0; i < 6; i++) manager.addGame('mu-1', 0, mu);
    for (let i = 0; i < 3; i++) manager.addGame('mu-1', 1, mu);

    expect(manager.isComplete('mu-1')).toBe(true);
    expect(onMatchComplete).toHaveBeenCalled();
  });

  it('handles a three-set match (side 2 wins)', () => {
    const onMatchComplete = vi.fn();
    const manager = new InlineScoringManager({ onMatchComplete });
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    // Set 1: 4-6 (side 2 wins)
    for (let i = 0; i < 4; i++) manager.addGame('mu-1', 0, mu);
    for (let i = 0; i < 6; i++) manager.addGame('mu-1', 1, mu);

    // Set 2: 6-3 (side 1 wins)
    for (let i = 0; i < 6; i++) manager.addGame('mu-1', 0, mu);
    for (let i = 0; i < 3; i++) manager.addGame('mu-1', 1, mu);

    // Set 3: 2-6 (side 2 wins match)
    for (let i = 0; i < 2; i++) manager.addGame('mu-1', 0, mu);
    for (let i = 0; i < 6; i++) manager.addGame('mu-1', 1, mu);

    expect(manager.isComplete('mu-1')).toBe(true);
    expect(onMatchComplete.mock.calls[0][0].winningSide).toBe(2);
  });
});

describe('Integration: undo/redo across game boundaries', () => {
  it('undo after game completion restores previous state', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    // Score 2 games for side 1 via addGame
    manager.addGame('mu-1', 0, mu);
    manager.addGame('mu-1', 0, mu);
    const afterGames = manager.getMatchUp('mu-1', mu);
    expect(afterGames.score?.sets?.[0]?.side1Score).toBe(2);

    // Undo last game
    manager.undo('mu-1', mu);
    const afterUndo = manager.getMatchUp('mu-1', mu);
    expect(afterUndo.score?.sets?.[0]?.side1Score).toBe(1);

    // Redo
    manager.redo('mu-1', mu);
    const afterRedo = manager.getMatchUp('mu-1', mu);
    expect(afterRedo.score?.sets?.[0]?.side1Score).toBe(2);
  });

  it('multiple undos work correctly', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    manager.addGame('mu-1', 0, mu);
    manager.addGame('mu-1', 0, mu);
    manager.addGame('mu-1', 1, mu);

    // 2-1
    let result = manager.getMatchUp('mu-1', mu);
    expect(result.score?.sets?.[0]?.side1Score).toBe(2);
    expect(result.score?.sets?.[0]?.side2Score).toBe(1);

    manager.undo('mu-1', mu);
    result = manager.getMatchUp('mu-1', mu);
    expect(result.score?.sets?.[0]?.side2Score).toBe(0);

    manager.undo('mu-1', mu);
    result = manager.getMatchUp('mu-1', mu);
    expect(result.score?.sets?.[0]?.side1Score).toBe(1);
  });
});

describe('Integration: engineToMatchUp with ScoringEngine directly', () => {
  it('preserves participant data through bridge', () => {
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_FORMAT });
    engine.addGame({ winner: 0 });

    const base = makeMatchUp();
    const result = engineToMatchUp(engine, base);

    expect(result.sides?.[0]?.participant?.participantName).toBe('Player 1');
    expect(result.sides?.[1]?.participant?.participantName).toBe('Player 2');
  });

  it('injects point display only into active set', () => {
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_FORMAT });
    engine.addPoint({ winner: 0, server: 0, result: 'Winner' });

    const base = makeMatchUp();
    const result = engineToMatchUp(engine, base);
    const sets = result.score?.sets || [];

    // Should have exactly 1 set (active)
    expect(sets.length).toBe(1);
    // Active set should have point display
    expect(sets[0].side1PointScore).toBeDefined();
    expect(sets[0].side2PointScore).toBeDefined();
  });

  it('does not inject points into completed sets', () => {
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_FORMAT });

    // Complete set 1
    for (let g = 0; g < 6; g++) engine.addGame({ winner: 0 });

    // Score 1 point in set 2
    engine.addPoint({ winner: 1, server: 0, result: 'Winner' });

    const result = engineToMatchUp(engine, makeMatchUp());
    const sets = result.score?.sets || [];

    // Set 1 (completed) should NOT have point scores
    expect(sets[0].winningSide).toBe(1);
    expect((sets[0] as any).side1PointScore).toBeUndefined();

    // Set 2 (active) should have point scores
    expect(sets[1].side1PointScore).toBeDefined();
  });

  it('scoreboard string is populated', () => {
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_FORMAT });
    for (let g = 0; g < 3; g++) engine.addGame({ winner: 0 });
    for (let g = 0; g < 2; g++) engine.addGame({ winner: 1 });

    const result = engineToMatchUp(engine, makeMatchUp());
    expect(result.score?.scoreStringSide1).toBeDefined();
    expect(result.score?.scoreStringSide1?.length).toBeGreaterThan(0);
  });
});

describe('Integration: callback sequencing', () => {
  it('onScoreChange fires before onMatchComplete', () => {
    const callOrder: string[] = [];
    const manager = new InlineScoringManager({
      onScoreChange: () => callOrder.push('scoreChange'),
      onMatchComplete: () => callOrder.push('matchComplete'),
    });
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    // Play to completion via addGame
    for (let s = 0; s < 2; s++) {
      for (let g = 0; g < 6; g++) {
        manager.addGame('mu-1', 0, mu);
      }
    }

    // Both should have fired, scoreChange should come first
    expect(callOrder).toContain('scoreChange');
    expect(callOrder).toContain('matchComplete');
    const lastScoreChange = callOrder.lastIndexOf('scoreChange');
    const matchComplete = callOrder.indexOf('matchComplete');
    // The final scoreChange should be just before matchComplete
    expect(lastScoreChange).toBeLessThan(matchComplete);
  });

  it('onScoreChange fires on every action', () => {
    const onScoreChange = vi.fn();
    const manager = new InlineScoringManager({ onScoreChange });
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    manager.addGame('mu-1', 0, mu);
    manager.addGame('mu-1', 1, mu);
    manager.addGame('mu-1', 0, mu);

    expect(onScoreChange).toHaveBeenCalledTimes(3);
  });

  it('onScoreChange fires on undo and redo', () => {
    const onScoreChange = vi.fn();
    const manager = new InlineScoringManager({ onScoreChange });
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    manager.addGame('mu-1', 0, mu); // 1
    manager.undo('mu-1', mu);        // 2
    manager.redo('mu-1', mu);        // 3

    expect(onScoreChange).toHaveBeenCalledTimes(3);
  });
});

describe('Integration: manager state isolation', () => {
  it('different matchUps in same manager are fully independent', () => {
    const manager = new InlineScoringManager();
    const mu1 = makeMatchUp({ matchUpId: 'mu-1' });
    const mu2 = makeMatchUp({ matchUpId: 'mu-2' });

    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu1);
    manager.getOrCreate('mu-2', STANDARD_FORMAT, mu2);

    // Score differently
    for (let g = 0; g < 6; g++) manager.addGame('mu-1', 0, mu1);
    manager.addGame('mu-2', 1, mu2);

    const r1 = manager.getMatchUp('mu-1', mu1);
    const r2 = manager.getMatchUp('mu-2', mu2);

    // mu-1 should have set 1 complete
    expect(r1.score?.sets?.[0]?.winningSide).toBe(1);
    // mu-2 should have only 1 game played
    expect(r2.score?.sets?.[0]?.side1Score).toBe(0);
    expect(r2.score?.sets?.[0]?.side2Score).toBe(1);
  });

  it('removing one engine does not affect another', () => {
    const manager = new InlineScoringManager();
    const mu1 = makeMatchUp({ matchUpId: 'mu-1' });
    const mu2 = makeMatchUp({ matchUpId: 'mu-2' });

    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu1);
    manager.getOrCreate('mu-2', STANDARD_FORMAT, mu2);

    manager.addGame('mu-1', 0, mu1);
    manager.addGame('mu-2', 1, mu2);

    manager.remove('mu-1');

    expect(manager.has('mu-1')).toBe(false);
    expect(manager.has('mu-2')).toBe(true);

    const r2 = manager.getMatchUp('mu-2', mu2);
    expect(r2.score?.sets?.[0]?.side2Score).toBe(1);
  });
});
