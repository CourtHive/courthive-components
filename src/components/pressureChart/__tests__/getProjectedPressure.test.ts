import { describe, it, expect } from 'vitest';

import { buildEliminationFixture, completeMatchUp, WTN } from './buildFixture';
import { getProjectedPressure } from '../getProjectedPressure';
import { ratingToElo } from '../ratingScale';

// constants and types
import { PRESSURE_UNSUPPORTED } from '../types';

const EVEN_FIELD = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ participantId: `p${n}`, rating: 10 }));

function projectionFor(result: ReturnType<typeof getProjectedPressure>, participantId: string) {
  const projection = result.projections.find((p) => p.participantId === participantId);
  if (!projection) throw new Error(`no projection for ${participantId}`);
  return projection;
}

describe('getProjectedPressure — structural guards', () => {
  it('refuses a structure whose rounds do not halve rather than inventing a tree', () => {
    const matchUps = [
      { matchUpId: 'a', roundNumber: 1, roundPosition: 1, sides: [{ sideNumber: 1 }, { sideNumber: 2 }] },
      { matchUpId: 'b', roundNumber: 1, roundPosition: 2, sides: [{ sideNumber: 1 }, { sideNumber: 2 }] },
      { matchUpId: 'c', roundNumber: 2, roundPosition: 1, sides: [{ sideNumber: 1 }, { sideNumber: 2 }] },
      { matchUpId: 'd', roundNumber: 2, roundPosition: 2, sides: [{ sideNumber: 1 }, { sideNumber: 2 }] }
    ];
    expect(getProjectedPressure({ matchUps }).unsupported).toBe(PRESSURE_UNSUPPORTED.NOT_ELIMINATION);
  });

  it('reports NO_MATCHUPS for an empty structure', () => {
    expect(getProjectedPressure({ matchUps: [] }).unsupported).toBe(PRESSURE_UNSUPPORTED.NO_MATCHUPS);
  });

  it('reports NO_RATINGS — and does NOT fall back to a default rating — when the field is unrated', () => {
    const matchUps = buildEliminationFixture({
      entrants: [1, 2, 3, 4].map((n) => ({ participantId: `p${n}` }))
    });
    const result = getProjectedPressure({ matchUps });
    expect(result.unsupported).toBe(PRESSURE_UNSUPPORTED.NO_RATINGS);
    expect(result.projections).toHaveLength(0);
    expect(result.unratedCount).toBe(4);
  });

  it('surfaces a partially unrated field via unratedCount instead of hiding it', () => {
    const matchUps = buildEliminationFixture({
      entrants: [
        { participantId: 'p1', rating: 8 },
        { participantId: 'p2' },
        { participantId: 'p3', rating: 20 },
        { participantId: 'p4', rating: 21 }
      ]
    });
    const result = getProjectedPressure({ matchUps });
    expect(result.unratedCount).toBe(1);
    expect(result.projections).toHaveLength(4);
    expect(projectionFor(result, 'p2').rating).toBeNull();
    expect(projectionFor(result, 'p2').pathDifficulty).toBeNull();
  });
});

describe('getProjectedPressure — an even field is the analytic control', () => {
  const result = getProjectedPressure({ matchUps: buildEliminationFixture({ entrants: EVEN_FIELD }) });

  it('halves the reach probability each round when every rating is identical', () => {
    const rounds = projectionFor(result, 'p1').rounds;
    expect(rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3]);
    expect(rounds.map((r) => Number(r.reachProbability.toFixed(4)))).toEqual([1, 0.5, 0.25]);
  });

  it('projects a zero signed delta in every round when every rating is identical', () => {
    for (const round of projectionFor(result, 'p1').rounds) {
      expect(round.expectedSignedDelta).toBeCloseTo(0, 10);
    }
    expect(projectionFor(result, 'p1').pathDifficulty).toBeCloseTo(0, 10);
  });

  it('expects 1.75 matches played from an 8 draw with an even field', () => {
    expect(projectionFor(result, 'p1').expectedMatchesPlayed).toBeCloseTo(1 + 0.5 + 0.25, 10);
  });

  it('widens the opponent pool 1 -> 2 -> 4 as the rounds advance', () => {
    expect(projectionFor(result, 'p1').rounds.map((r) => r.possibleOpponentCount)).toEqual([1, 2, 4]);
    expect(projectionFor(result, 'p1').rounds.map((r) => r.resolved)).toEqual([true, false, false]);
  });
});

describe('getProjectedPressure — the opponent pool is the SIBLING sub-bracket', () => {
  // dp1/dp2 are strong (low WTN), dp3/dp4 are weak. p1's round-2 opponents must
  // be exactly {p3, p4} — never its own half. This is the regression that a
  // uniform-rating fixture cannot catch, because there every pool looks alike.
  const matchUps = buildEliminationFixture({
    entrants: [
      { participantId: 'p1', rating: 5 },
      { participantId: 'p2', rating: 6 },
      { participantId: 'p3', rating: 30 },
      { participantId: 'p4', rating: 31 }
    ]
  });
  const result = getProjectedPressure({ matchUps });

  const opponentIds = (participantId: string, roundIndex: number) =>
    projectionFor(result, participantId)
      .rounds[roundIndex].possibleOpponents.map((o) => o.participantId)
      .toSorted((a, b) => a.localeCompare(b, 'en'));

  it('draws round-2 opponents from the other half of the draw (odd feeder slot)', () => {
    // p1 arrives from R1P1. Its sibling feeder is R1P2 -> {p3, p4}.
    expect(opponentIds('p1', 1)).toEqual(['p3', 'p4']);
  });

  it('draws round-2 opponents from the other half for an EVEN feeder slot too', () => {
    // p3 arrives from R1P2, so its sibling feeder is R1P1 -> {p1, p2}.
    // This is the case the previous-vs-current position bug got wrong: deriving
    // the sibling from the CURRENT round position returns R1P2 for everyone in
    // this matchUp, so p3 would have been given ITSELF and p4 as opponents.
    expect(opponentIds('p3', 1)).toEqual(['p1', 'p2']);
    expect(opponentIds('p3', 1)).not.toContain('p3');
  });

  it('reports the round-2 opponent rating range from the sibling half', () => {
    const round2 = projectionFor(result, 'p1').rounds[1];
    expect(round2.possibleOpponentCount).toBe(2);
    expect(round2.opponentEloRange).not.toBeNull();
    const [low, high] = round2.opponentEloRange as [number, number];
    const eloP3 = ratingToElo({ scaleName: WTN, value: 30 }) as number;
    const eloP4 = ratingToElo({ scaleName: WTN, value: 31 }) as number;
    expect(low).toBeCloseTo(Math.min(eloP3, eloP4), 6);
    expect(high).toBeCloseTo(Math.max(eloP3, eloP4), 6);
  });

  it('names the round-1 opponent exactly', () => {
    expect(opponentIds('p1', 0)).toEqual(['p2']);
    expect(opponentIds('p3', 0)).toEqual(['p4']);
  });

  it('projects a hard round 1 and an easy round 2 for a strong player in a stacked half', () => {
    const [round1, round2] = projectionFor(result, 'p1').rounds;
    // p2 is nearly as strong as p1 -> a small delta; the weak half is far below.
    expect(round1.expectedSignedDelta).toBeLessThan(0);
    expect(round2.expectedSignedDelta).toBeLessThan(round1.expectedSignedDelta);
  });

  it('gives the weak half a much harder projected path than the strong half', () => {
    const strong = projectionFor(result, 'p1').pathDifficulty as number;
    const weak = projectionFor(result, 'p3').pathDifficulty as number;
    expect(weak).toBeGreaterThan(strong);
    // The weak player is projected to play up; the strong player to play down.
    expect(weak).toBeGreaterThan(0);
    expect(strong).toBeLessThan(0);
  });
});

describe('getProjectedPressure — byes', () => {
  const matchUps = buildEliminationFixture({
    entrants: [
      { participantId: 'p1', rating: 10 },
      { bye: true, participantId: 'bye1' },
      { participantId: 'p3', rating: 12 },
      { participantId: 'p4', rating: 14 }
    ]
  });
  const result = getProjectedPressure({ matchUps });

  it('marks the bye round, gives it no opponent, and advances the player with certainty', () => {
    const [round1, round2] = projectionFor(result, 'p1').rounds;
    expect(round1.bye).toBe(true);
    expect(round1.possibleOpponentCount).toBe(0);
    expect(round1.expectedSignedDelta).toBeNull();
    expect(round2.reachProbability).toBe(1);
  });

  it('excludes the bye round from expectedMatchesPlayed and from pathDifficulty', () => {
    const projection = projectionFor(result, 'p1');
    expect(projection.expectedMatchesPlayed).toBeCloseTo(1, 10);
    // pathDifficulty must come from round 2 alone.
    expect(projection.pathDifficulty).toBeCloseTo(projection.rounds[1].expectedSignedDelta as number, 10);
  });

  it('does not treat the bye participant as an entrant', () => {
    expect(result.projections.map((p) => p.participantId).toSorted((a, b) => a.localeCompare(b, 'en'))).toEqual([
      'p1',
      'p3',
      'p4'
    ]);
  });
});

describe('getProjectedPressure — respectResults', () => {
  const entrants = [
    { participantId: 'p1', rating: 5 },
    { participantId: 'p2', rating: 6 },
    { participantId: 'p3', rating: 30 },
    { participantId: 'p4', rating: 31 }
  ];

  it('leaves the projection untouched by results by default', () => {
    const matchUps = buildEliminationFixture({ entrants });
    completeMatchUp({ matchUps, matchUpId: 'r1p2', winningSide: 2 }); // p4 upsets p3
    const round2 = projectionFor(getProjectedPressure({ matchUps }), 'p1').rounds[1];
    expect(round2.possibleOpponentCount).toBe(2);
    expect(round2.resolved).toBe(false);
  });

  it('collapses a decided feeder to its actual winner when respectResults is set', () => {
    const matchUps = buildEliminationFixture({ entrants });
    completeMatchUp({ matchUps, matchUpId: 'r1p2', winningSide: 2 });
    const round2 = projectionFor(getProjectedPressure({ matchUps, respectResults: true }), 'p1').rounds[1];
    expect(round2.possibleOpponentCount).toBe(1);
    expect(round2.resolved).toBe(true);
    expect(round2.expectedOpponentElo).toBeCloseTo(ratingToElo({ scaleName: WTN, value: 31 }) as number, 6);
  });
});

describe('getProjectedPressure — winner distributions are proper', () => {
  it('gives every entrant a title probability summing to 1 across the field', () => {
    const matchUps = buildEliminationFixture({
      entrants: [8, 9, 12, 14, 20, 21, 25, 30].map((rating, index) => ({
        participantId: `p${index + 1}`,
        rating
      }))
    });
    const result = getProjectedPressure({ matchUps });
    // reachProbability of a hypothetical round after the final == P(win title).
    // Sum of P(reach final) across the field is exactly 2.
    const finalReach = result.projections.reduce((total, p) => total + (p.rounds.at(-1)?.reachProbability ?? 0), 0);
    expect(finalReach).toBeCloseTo(2, 8);
  });

  it('ranks the strongest player as the most likely finalist', () => {
    const matchUps = buildEliminationFixture({
      entrants: [8, 20, 21, 25].map((rating, index) => ({ participantId: `p${index + 1}`, rating }))
    });
    const result = getProjectedPressure({ matchUps });
    const byFinalReach = result.projections.toSorted(
      (a, b) => (b.rounds.at(-1)?.reachProbability ?? 0) - (a.rounds.at(-1)?.reachProbability ?? 0)
    );
    expect(byFinalReach[0].participantId).toBe('p1');
  });
});
