/**
 * Side swapping for a home/away flip of the scorecard: a matchUp's sides, set scores and winner mirrored.
 */
export function swapWinningSide(winningSide?: number): number | undefined {
  if (winningSide === 1) return 2;
  if (winningSide === 2) return 1;
  return undefined;
}

export function swapSetScores(sets?: any[]): any[] | undefined {
  if (!sets) return undefined;
  return sets.map((set: any) => ({
    ...set,
    side1Score: set.side2Score,
    side2Score: set.side1Score,
    side1TiebreakScore: set.side2TiebreakScore,
    side2TiebreakScore: set.side1TiebreakScore
  }));
}

export function swapMatchUpSides(matchUp: any): any {
  const swappedSides = matchUp.sides?.map((side: any) => ({
    ...side,
    sideNumber: side.sideNumber === 1 ? 2 : 1
  }));
  return {
    ...matchUp,
    sides: swappedSides,
    score: matchUp.score ? { ...matchUp.score, sets: swapSetScores(matchUp.score.sets) } : matchUp.score,
    winningSide: swapWinningSide(matchUp.winningSide)
  };
}
