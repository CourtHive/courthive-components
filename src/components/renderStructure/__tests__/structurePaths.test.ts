import { buildPathIndex } from '../structurePaths';
import { describe, expect, it } from 'vitest';

// constants and types
import type { MatchUp } from '../../../types';

const P = 'player';

/** Synthetic matchUps: `counts[r]` matchUps in round r + 1; the player sits in round 1, position `start`. */
function shape(counts: number[], start: number): { matchUps: MatchUp[]; roundProfile: Record<string, any> } {
  const matchUps: MatchUp[] = [];
  counts.forEach((count, index) => {
    for (let roundPosition = 1; roundPosition <= count; roundPosition += 1) {
      const roundNumber = index + 1;
      const hasPlayer = roundNumber === 1 && roundPosition === start;
      matchUps.push({
        matchUpId: `r${roundNumber}p${roundPosition}`,
        structureId: 's',
        roundNumber,
        roundPosition,
        sides: hasPlayer ? [{ sideNumber: 1, participant: { participantId: P } }] : []
      } as MatchUp);
    }
  });
  const roundProfile = Object.fromEntries(counts.map((count, index) => [String(index + 1), { matchUpsCount: count }]));
  return { matchUps, roundProfile };
}

describe('buildPathIndex projection', () => {
  it('halves the position in a halving round and keeps it in a feed round', () => {
    // 4, 2 (halving), 2 (feed), 1 (halving)
    const { matchUps, roundProfile } = shape([4, 2, 2, 1], 3);
    const path = buildPathIndex({ matchUps, roundProfile, projectable: true })(P);
    expect(path?.played).toEqual(['r1p3']);
    expect(path?.projected).toEqual(['r2p2', 'r3p2', 'r4p1']);
  });

  it('projects nothing for a structure that is not projectable, whatever its shape', () => {
    // equal round counts with positions: a shape a round robin could present
    const { matchUps, roundProfile } = shape([2, 2, 2], 2);
    expect(buildPathIndex({ matchUps, roundProfile, projectable: true })(P)?.projected).toEqual(['r2p2', 'r3p2']);
    expect(buildPathIndex({ matchUps, roundProfile, projectable: false })(P)?.projected).toEqual([]);
  });

  it('stops at a round the shape does not explain', () => {
    const { matchUps, roundProfile } = shape([4, 3, 1], 1);
    expect(buildPathIndex({ matchUps, roundProfile, projectable: true })(P)?.projected).toEqual([]);
  });

  it('projects nothing for an eliminated participant', () => {
    const { matchUps, roundProfile } = shape([2, 1], 1);
    const first = matchUps[0];
    first.sides = [
      { sideNumber: 1, participant: { participantId: P } },
      { sideNumber: 2, participant: { participantId: 'other' } }
    ];
    first.winningSide = 2;
    const path = buildPathIndex({ matchUps, roundProfile, projectable: true })(P);
    expect(path).toEqual({ played: ['r1p1'], won: [], projected: [] });
  });
});
