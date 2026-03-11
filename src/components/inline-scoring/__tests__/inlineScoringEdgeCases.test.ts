/**
 * Edge case tests for inline scoring:
 * - Tiebreak handling
 * - No-advantage format
 * - Best-of-1 match
 * - Different match formats
 * - Completed match re-scoring prevention
 * - Entry mode via addSet
 */
import { describe, it, expect, vi } from 'vitest';
import { InlineScoringManager } from '../inlineScoringManager';
import type { MatchUp } from '../../../types';

const STANDARD_FORMAT = 'SET3-S:6/TB7';
const NON_EXISTENT = 'non-existent';

function makeMatchUp(overrides: Partial<MatchUp> = {}): MatchUp {
  return {
    matchUpId: 'mu-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    matchUpStatus: 'IN_PROGRESS',
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Player 1' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } },
    ],
    ...overrides,
  } as MatchUp;
}

describe('Tiebreak handling', () => {
  const FORMAT = STANDARD_FORMAT;

  it('reaches tiebreak at 6-6 via addGame', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', FORMAT, mu);

    // Alternate games to reach 6-6 in set 1
    for (let i = 0; i < 6; i++) {
      manager.addGame('mu-1', 0, mu);
      manager.addGame('mu-1', 1, mu);
    }

    const result = manager.getMatchUp('mu-1', mu);
    const set1 = result.score?.sets?.[0];
    // Set should not be won yet (tiebreak needed)
    expect(set1?.winningSide).toBeUndefined();
    expect(set1?.side1Score).toBe(6);
    expect(set1?.side2Score).toBe(6);
  });

  it('tiebreak resolves set via addPoint', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', FORMAT, mu);

    // Alternate games to reach 6-6 in set 1
    for (let i = 0; i < 6; i++) {
      manager.addGame('mu-1', 0, mu);
      manager.addGame('mu-1', 1, mu);
    }

    // Tiebreak must be played point-by-point (7 points to win)
    for (let i = 0; i < 7; i++) {
      manager.addPoint('mu-1', 0, mu);
    }

    const result = manager.getMatchUp('mu-1', mu);
    const set1 = result.score?.sets?.[0];
    expect(set1?.winningSide).toBe(1);
    expect(set1?.side1Score).toBe(7);
    expect(set1?.side1TiebreakScore).toBe(7);
  });
});

describe('No-advantage format (SET3-S:6NOAD/TB7)', () => {
  const NO_AD = 'SET3-S:6NOAD/TB7';

  it('creates engine with no-ad format', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    const state = manager.getOrCreate('mu-1', NO_AD, mu);
    expect(state.matchUpFormat).toBe(NO_AD);
  });

  it('completes match via addGame', () => {
    const onMatchComplete = vi.fn();
    const manager = new InlineScoringManager({ onMatchComplete });
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', NO_AD, mu);

    // Two sets of 6-0
    for (let s = 0; s < 2; s++) {
      for (let g = 0; g < 6; g++) {
        manager.addGame('mu-1', 0, mu);
      }
    }

    expect(manager.isComplete('mu-1')).toBe(true);
    expect(onMatchComplete).toHaveBeenCalled();
  });
});

describe('Best-of-1 format (SET1-S:6/TB7)', () => {
  const BEST_OF_1 = 'SET1-S:6/TB7';

  it('completes after single set', () => {
    const onMatchComplete = vi.fn();
    const manager = new InlineScoringManager({ onMatchComplete });
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', BEST_OF_1, mu);

    for (let g = 0; g < 6; g++) {
      manager.addGame('mu-1', 0, mu);
    }

    expect(manager.isComplete('mu-1')).toBe(true);
    expect(onMatchComplete).toHaveBeenCalledTimes(1);
  });

  it('scoreboard shows single set result', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', BEST_OF_1, mu);

    for (let g = 0; g < 6; g++) manager.addGame('mu-1', 0, mu);
    for (let g = 0; g < 4; g++) manager.addGame('mu-1', 1, mu);

    const result = manager.getMatchUp('mu-1', mu);
    expect(result.score?.sets?.length).toBe(1);
    expect(result.score?.sets?.[0]?.winningSide).toBe(1);
  });
});

describe('Best-of-5 format (SET5-S:6/TB7)', () => {
  const BEST_OF_5 = 'SET5-S:6/TB7';

  it('needs 3 sets to win', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', BEST_OF_5, mu);

    // Win 2 sets
    for (let s = 0; s < 2; s++) {
      for (let g = 0; g < 6; g++) manager.addGame('mu-1', 0, mu);
    }

    expect(manager.isComplete('mu-1')).toBe(false);

    // Win 3rd set
    for (let g = 0; g < 6; g++) manager.addGame('mu-1', 0, mu);

    expect(manager.isComplete('mu-1')).toBe(true);
  });
});

describe('Completed match prevents further scoring', () => {
  const FORMAT = STANDARD_FORMAT;

  it('addPoint returns undefined after match complete', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', FORMAT, mu);

    // Complete the match
    for (let s = 0; s < 2; s++) {
      for (let g = 0; g < 6; g++) manager.addGame('mu-1', 0, mu);
    }

    expect(manager.isComplete('mu-1')).toBe(true);
    const result = manager.addPoint('mu-1', 0, mu);
    expect(result).toBeUndefined();
  });

  it('addGame returns undefined after match complete', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', FORMAT, mu);

    for (let s = 0; s < 2; s++) {
      for (let g = 0; g < 6; g++) manager.addGame('mu-1', 0, mu);
    }

    const result = manager.addGame('mu-1', 0, mu);
    expect(result).toBeUndefined();
  });

  it('addSet returns undefined after match complete', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', FORMAT, mu);

    manager.addSet('mu-1', 6, 4, mu);
    manager.addSet('mu-1', 6, 3, mu);

    expect(manager.isComplete('mu-1')).toBe(true);
    const result = manager.addSet('mu-1', 6, 0, mu);
    expect(result).toBeUndefined();
  });
});

describe('Entry mode via addSet', () => {
  const FORMAT = STANDARD_FORMAT;

  it('addSet records a single set score', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', FORMAT, mu);

    const result = manager.addSet('mu-1', 6, 4, mu);
    expect(result).toBeDefined();

    const sets = result!.score?.sets || [];
    expect(sets.length).toBeGreaterThanOrEqual(1);
    expect(sets[0].side1Score).toBe(6);
    expect(sets[0].side2Score).toBe(4);
    expect(sets[0].winningSide).toBe(1);
  });

  it('addSet completes match in two sets', () => {
    const onMatchComplete = vi.fn();
    const manager = new InlineScoringManager({ onMatchComplete });
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', FORMAT, mu);

    manager.addSet('mu-1', 6, 4, mu);
    manager.addSet('mu-1', 7, 5, mu);

    expect(manager.isComplete('mu-1')).toBe(true);
    expect(onMatchComplete).toHaveBeenCalled();
  });

  it('addSet handles split sets and third set', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', FORMAT, mu);

    manager.addSet('mu-1', 6, 4, mu); // Side 1
    manager.addSet('mu-1', 3, 6, mu); // Side 2
    expect(manager.isComplete('mu-1')).toBe(false);

    manager.addSet('mu-1', 6, 2, mu); // Side 1 wins
    expect(manager.isComplete('mu-1')).toBe(true);
  });

  it('undo reverses addSet', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', FORMAT, mu);

    manager.addSet('mu-1', 6, 4, mu);
    expect(manager.canUndo('mu-1')).toBe(true);

    manager.undo('mu-1', mu);
    const result = manager.getMatchUp('mu-1', mu);
    // After undo, should be back to initial state
    const sets = result.score?.sets || [];
    const completedSets = sets.filter((s: any) => s.winningSide != null);
    expect(completedSets.length).toBe(0);
  });
});

describe('Manager edge cases', () => {
  it('undo on fresh engine returns undefined', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    const result = manager.undo('mu-1', mu);
    expect(result).toBeUndefined();
  });

  it('redo without prior undo returns undefined', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    manager.addGame('mu-1', 0, mu);
    const result = manager.redo('mu-1', mu);
    expect(result).toBeUndefined();
  });

  it('reset on fresh engine returns valid matchUp', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, mu);

    const result = manager.reset('mu-1', mu);
    expect(result).toBeDefined();
    expect(result!.matchUpId).toBe('mu-1');
  });

  it('getMatchUp on non-existent engine returns base matchUp', () => {
    const manager = new InlineScoringManager();
    const mu = makeMatchUp();
    const result = manager.getMatchUp(NON_EXISTENT, mu);
    expect(result).toBe(mu); // Returns the base matchUp as-is
  });

  it('getSituation on non-existent engine returns undefined', () => {
    const manager = new InlineScoringManager();
    expect(manager.getSituation(NON_EXISTENT)).toBeUndefined();
  });

  it('canUndo/canRedo on non-existent engine returns false', () => {
    const manager = new InlineScoringManager();
    expect(manager.canUndo(NON_EXISTENT)).toBe(false);
    expect(manager.canRedo(NON_EXISTENT)).toBe(false);
  });

  it('isComplete on non-existent engine returns false', () => {
    const manager = new InlineScoringManager();
    expect(manager.isComplete(NON_EXISTENT)).toBe(false);
  });
});
