import type { MatchUp } from '../../types';

/**
 * Bridge: converts ScoringEngine state into a TODS-compatible MatchUp object
 * suitable for renderMatchUp(). Injects live point display into the active set.
 */
export function engineToMatchUp(engine: any, baseMatchUp: MatchUp): MatchUp {
  const isComplete = engine.isComplete();
  const inputMode = engine.getInputMode(); // 'points' | 'games' | 'sets' | 'mixed' | 'none'
  const hasEngineHistory = inputMode !== 'none';

  // When the engine has no scoring actions yet (just loaded initial state),
  // use the baseMatchUp's persisted score directly — the engine can't faithfully
  // reproduce point scores, and reconstruction introduces phantom sets.
  if (!hasEngineHistory && baseMatchUp.score?.sets?.length) {
    return {
      ...baseMatchUp,
      matchUpStatus: isComplete ? 'COMPLETED' : baseMatchUp.matchUpStatus || 'IN_PROGRESS',
      winningSide: engine.getWinner() ?? baseMatchUp.winningSide ?? undefined
    };
  }

  const score = engine.getScore();

  // Only inject pointDisplay when the engine is in point-tracking mode.
  // In 'games' mode, pointDisplay is always ["0","0"] from computePointDisplay
  // which is meaningless — don't inject it.
  const usePointDisplay = score.pointDisplay && (inputMode === 'points' || inputMode === 'mixed');

  let sets = (score.sets || []).map((s: any, i: number) => ({
    setNumber: i + 1,
    side1Score: s.side1Score,
    side2Score: s.side2Score,
    side1TiebreakScore: s.side1TiebreakScore,
    side2TiebreakScore: s.side2TiebreakScore,
    winningSide: s.winningSide,
    // Inject current game point display into the active (unwon) set
    // only when engine is tracking points (not in games-only mode)
    ...(usePointDisplay &&
      !s.winningSide &&
      !isComplete && {
        side1PointScore: score.pointDisplay[0],
        side2PointScore: score.pointDisplay[1]
      })
  }));

  // Skip placeholder sets and point injection only for irregular endings that
  // produce a winner (RET, WO, DEF) — the match is decided, no more scoring.
  // Statuses like SUSPENDED, CANCELLED, ABANDONED don't have a winner and
  // should still show game/point scores for display and resumption.
  const terminalIrregularStatuses = ['RETIRED', 'DEFAULTED', 'WALKOVER', 'DOUBLE_WALKOVER', 'DOUBLE_DEFAULT'];
  const hasIrregularStatus = baseMatchUp.matchUpStatus && terminalIrregularStatuses.includes(baseMatchUp.matchUpStatus);

  // Ensure there's always an active (unwon) set when the match isn't complete.
  // The engine only adds a new set entry once the first point of that set is scored,
  // so between sets there's no unwon set to render or click on.
  if (!isComplete && !hasIrregularStatus) {
    const allSetsWon = sets.length > 0 && sets.every((s: any) => s.winningSide);
    if (sets.length === 0 || allSetsWon) {
      sets.push({ setNumber: sets.length + 1, side1Score: 0, side2Score: 0 });
    }
  }

  // Inject initial point scores into the active set (provides clickable targets in all modes)
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
    matchUpStatus: isComplete ? 'COMPLETED' : baseMatchUp.matchUpStatus || 'IN_PROGRESS',
    winningSide: winner ?? baseMatchUp.winningSide ?? undefined,
    score: {
      sets,
      scoreStringSide1: engine.getScoreboard() || undefined
    }
  };
}
