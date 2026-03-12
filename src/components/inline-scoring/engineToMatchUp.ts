import type { MatchUp } from '../../types';

/**
 * Bridge: converts ScoringEngine state into a TODS-compatible MatchUp object
 * suitable for renderMatchUp(). Injects live point display into the active set.
 */
export function engineToMatchUp(engine: any, baseMatchUp: MatchUp): MatchUp {
  const score = engine.getScore();
  const isComplete = engine.isComplete();

  const sets = (score.sets || []).map((s: any, i: number) => ({
    setNumber: i + 1,
    side1Score: s.side1Score,
    side2Score: s.side2Score,
    side1TiebreakScore: s.side1TiebreakScore,
    side2TiebreakScore: s.side2TiebreakScore,
    winningSide: s.winningSide,
    // Inject current game point display into the active (unwon) set
    ...(score.pointDisplay &&
      !s.winningSide &&
      !isComplete && {
        side1PointScore: score.pointDisplay[0],
        side2PointScore: score.pointDisplay[1],
      }),
  }));

  const winner = engine.getWinner();

  return {
    ...baseMatchUp,
    matchUpStatus: isComplete ? 'COMPLETED' : (baseMatchUp.matchUpStatus || 'IN_PROGRESS'),
    // getWinner() returns 1-based side number (1 or 2), matching TODS winningSide
    winningSide: winner ?? undefined,
    score: {
      sets,
      scoreStringSide1: engine.getScoreboard() || (engine.getPointCount() > 0 ? '0-0' : undefined),
    },
  };
}
