import type { MatchUp } from '../../types';

/**
 * Bridge: converts ScoringEngine state into a TODS-compatible MatchUp object
 * suitable for renderMatchUp(). Injects live point display into the active set.
 */
export function engineToMatchUp(engine: any, baseMatchUp: MatchUp): MatchUp {
  const score = engine.getScore();
  const isComplete = engine.isComplete();

  let sets = (score.sets || []).map((s: any, i: number) => ({
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

  // Skip placeholder sets and point injection for irregular endings (WO, etc.)
  // where the engine has been reset but the match is over
  const hasIrregularStatus = baseMatchUp.matchUpStatus &&
    !['IN_PROGRESS', 'COMPLETED', 'TO_BE_PLAYED'].includes(baseMatchUp.matchUpStatus);

  // Ensure there's always an active (unwon) set when the match isn't complete.
  // The engine only adds a new set entry once the first point of that set is scored,
  // so between sets there's no unwon set to render or click on.
  if (!isComplete && !hasIrregularStatus) {
    const allSetsWon = sets.length > 0 && sets.every((s: any) => s.winningSide);
    if (sets.length === 0 || allSetsWon) {
      sets.push({ setNumber: sets.length + 1, side1Score: 0, side2Score: 0 });
    }
  }

  // Inject initial point scores into the active set when no pointDisplay yet
  if (!isComplete && !hasIrregularStatus && sets.length > 0) {
    const lastSet = sets[sets.length - 1];
    if (!lastSet.winningSide && lastSet.side1PointScore == null && lastSet.side2PointScore == null) {
      lastSet.side1PointScore = '0';
      lastSet.side2PointScore = '0';
    }
  }

  const winner = engine.getWinner();

  return {
    ...baseMatchUp,
    matchUpStatus: isComplete ? 'COMPLETED' : (baseMatchUp.matchUpStatus || 'IN_PROGRESS'),
    // getWinner() returns 1-based side number (1 or 2), matching TODS winningSide
    // Fall back to baseMatchUp.winningSide for irregular endings (WO/RET/DEF)
    winningSide: winner ?? baseMatchUp.winningSide ?? undefined,
    score: {
      sets,
      scoreStringSide1: engine.getScoreboard() || (engine.getPointCount() > 0 ? '0-0' : undefined),
    },
  };
}
