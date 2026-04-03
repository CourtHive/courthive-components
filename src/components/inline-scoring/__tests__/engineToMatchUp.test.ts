import { describe, it, expect } from 'vitest';
import { scoreGovernor } from 'tods-competition-factory';
import { engineToMatchUp } from '../engineToMatchUp';
import type { MatchUp } from '../../../types';

const { ScoringEngine } = scoreGovernor;
const STANDARD_FORMAT = 'SET3-S:6/TB7';

function baseMatchUp(): MatchUp {
  return {
    matchUpId: 'test-1',
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    matchUpStatus: 'IN_PROGRESS',
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Player 1' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Player 2' } }
    ]
  } as MatchUp;
}

describe('engineToMatchUp', () => {
  it('returns base matchUp data with engine score overlaid', () => {
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_FORMAT });
    const result = engineToMatchUp(engine, baseMatchUp());

    expect(result.matchUpId).toBe('test-1');
    expect(result.sides).toHaveLength(2);
    expect(result.score).toBeDefined();
  });

  it('injects point display into active set', () => {
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_FORMAT });
    // Score one point for side 1
    engine.addPoint({ winner: 0, server: 0, result: 'Winner' });

    const result = engineToMatchUp(engine, baseMatchUp());
    const sets = result.score?.sets || [];
    expect(sets.length).toBeGreaterThan(0);

    // The active set should have point scores injected
    const activeSet = sets.find((s: any) => !s.winningSide);
    if (activeSet) {
      expect(activeSet.side1PointScore).toBeDefined();
      expect(activeSet.side2PointScore).toBeDefined();
    }
  });

  it('sets matchUpStatus to COMPLETED when engine finishes', () => {
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_FORMAT });

    // Play a full match: 6-0, 6-0 using addGame
    for (let set = 0; set < 2; set++) {
      for (let game = 0; game < 6; game++) {
        engine.addGame({ winner: 0 });
      }
    }

    const result = engineToMatchUp(engine, baseMatchUp());
    expect(result.matchUpStatus).toBe('COMPLETED');
    expect(result.winningSide).toBe(1); // winner 0 → side 1
  });

  it('preserves base matchUp fields', () => {
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_FORMAT });
    const base = baseMatchUp();
    base.roundNumber = 2;
    base.roundPosition = 1;

    const result = engineToMatchUp(engine, base);
    expect(result.roundNumber).toBe(2);
    expect(result.roundPosition).toBe(1);
  });

  it('does not inject point display when match is complete', () => {
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_FORMAT });

    for (let set = 0; set < 2; set++) {
      for (let game = 0; game < 6; game++) {
        engine.addGame({ winner: 0 });
      }
    }

    const result = engineToMatchUp(engine, baseMatchUp());
    const sets = result.score?.sets || [];
    // No set should have side1PointScore since match is complete
    for (const s of sets) {
      expect((s as any).side1PointScore).toBeUndefined();
    }
  });
});
