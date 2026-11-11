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
    side2TiebreakScore: set.side1TiebreakScore,
    side1PointScore: set.side2PointScore,
    side2PointScore: set.side1PointScore,
    winningSide: swapWinningSide(set.winningSide)
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
    score: matchUp.score
      ? {
          ...matchUp.score,
          scoreStringSide1: matchUp.score.scoreStringSide2,
          scoreStringSide2: matchUp.score.scoreStringSide1,
          sets: swapSetScores(matchUp.score.sets)
        }
      : matchUp.score,
    serverSideNumber: swapWinningSide(matchUp.serverSideNumber),
    winningSide: swapWinningSide(matchUp.winningSide)
  };
}

/**
 * The aggregate tie score as the header shows it, left then right, with the winner by position: after a
 * swap side 2 is on the left, so its score and its win are too. Undefined when the result has no set.
 */
export function tieScoreDisplay(
  result: any,
  swapSides?: boolean
): { left: string; right: string; winner?: 1 | 2 } | undefined {
  const set = result?.score?.sets?.[0];
  if (!set) return undefined;
  const leftScoreKey = swapSides ? 'side2Score' : 'side1Score';
  const rightScoreKey = swapSides ? 'side1Score' : 'side2Score';
  const winningSide = swapSides ? swapWinningSide(result.winningSide) : result.winningSide;
  return {
    left: String(set[leftScoreKey] ?? 0),
    right: String(set[rightScoreKey] ?? 0),
    winner: winningSide === 1 || winningSide === 2 ? winningSide : undefined
  };
}
