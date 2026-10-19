import { InlineScoringManager } from '../inlineScoringManager';
import { scoreGovernor } from 'tods-competition-factory';
import { describe, it, expect, vi } from 'vitest';
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
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } }
    ],
    ...overrides
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

// The refusals need a factory with ScoringEngine.getInputLevels (it ships with the outs refusal)
const HAS_INPUT_LEVELS = typeof (scoreGovernor.ScoringEngine.prototype as any).getInputLevels === 'function';

describe.skipIf(!HAS_INPUT_LEVELS)('InlineScoringManager — input levels', () => {
  it('a final set of outs stops taking points once it is in play, instead of throwing', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp({ matchUpFormat: 'SET3-S:6/TB7-F:O3' } as Partial<MatchUp>);
    manager.getOrCreate('mu-1', 'SET3-S:6/TB7-F:O3', matchUp);
    expect(manager.accepts('mu-1', 'point')).toBe(true);
    for (let i = 0; i < 6; i++) manager.addGame('mu-1', 0, matchUp);
    for (let i = 0; i < 6; i++) manager.addGame('mu-1', 1, matchUp);
    expect(manager.accepts('mu-1', 'point')).toBe(false);
    expect(manager.addPoint('mu-1', 0, matchUp)).toBeUndefined();
    expect(manager.addGame('mu-1', 0, matchUp)).toBeUndefined();
  });

  it('reports nothing accepted for a matchUp it does not hold', () => {
    expect(new InlineScoringManager().accepts('missing', 'point')).toBe(false);
  });
});

describe('InlineScoringManager — who served', () => {
  it('leaves the server to the engine: one server per game, not one per point', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', 'SET3-S:6/TB7', matchUp);
    for (let i = 0; i < 4; i++) manager.addPoint('mu-1', 0, matchUp); // game 1
    for (let i = 0; i < 2; i++) manager.addPoint('mu-1', 1, matchUp); // game 2 under way

    const history = manager.get('mu-1')!.engine.getState().history;
    expect(history.points.map((point: any) => point.server)).toEqual([0, 0, 0, 0, 1, 1]);
    // calculated, so not recorded as an input the engine would replay as observed
    expect(history.entries.map((entry: any) => entry.data.server)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    ]);
  });
});

describe('InlineScoringManager — what a point records', () => {
  it('records only who won the point: no stroke the scorer never entered', () => {
    const manager = new InlineScoringManager();
    const matchUp = makeMatchUp();
    manager.getOrCreate('mu-1', STANDARD_FORMAT, matchUp);
    manager.addPoint('mu-1', 0, matchUp);
    manager.addPoint('mu-1', 1, matchUp);

    const engine = manager.get('mu-1')!.engine;
    expect(engine.getState().history.points.map((point: any) => point.result)).toEqual([undefined, undefined]);
    const { players } = engine.getStatistics().counters;
    expect(players[0].winners).toBeUndefined();
    expect(players[1].winners).toBeUndefined();
  });
});
