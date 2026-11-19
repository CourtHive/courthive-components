/**
 * Logic for determining when to expand set inputs dynamically
 */
import { isOvertimeFormat, overtimeProgress } from '../../../tools/overtimeEntry/overtimeEntry';
import { matchUpConfigFor } from 'tods-competition-factory/score-entry-state';
import { matchUpFormatCode } from 'tods-competition-factory';
import type { SetScore } from '../types';

type MatchUpFormatInfo = {
  bestOf: number;
  exactly?: number;
  setsToWin: number;
  isTimed: boolean;
  isExactlyFormat: boolean;
};

/**
 * A format's set counts, read from the factory's `matchUpConfigFor` — the one place a format's best-of, its
 * `exactly` count and the fallback for an unparseable code (`SET3-S:6/TB7`) are decided.
 * Examples: "SET3-S:6/TB7" → bestOf=3, "SET5-S:6/TB7" → bestOf=5, "SET3X-S:T10" → exactly=3, isTimed=true
 */
export function parseMatchUpFormat(matchUpFormat?: string): MatchUpFormatInfo {
  const config = matchUpConfigFor(matchUpFormat);
  const setCount = config.exactly ?? config.bestOf;
  return {
    bestOf: config.bestOf,
    exactly: config.exactly,
    setsToWin: Math.ceil(setCount / 2),
    isTimed: !!(config.setFormat?.timed || config.finalSetFormat?.timed),
    // bestOf:1 is functionally exactly:1
    isExactlyFormat: !!config.exactly || config.bestOf === 1
  };
}

/**
 * Determine if another set should be added based on current scores
 */
export function shouldExpandSets(sets: SetScore[], matchUpFormat?: string): boolean {
  if (!sets || sets.length === 0) return true;
  // an overtime format plays another set while the scoring engine calls the match undecided
  if (matchUpFormat && isOvertimeFormat(matchUpFormat)) return !overtimeProgress(matchUpFormat, sets).complete;

  const formatInfo = parseMatchUpFormat(matchUpFormat);
  const { bestOf, isExactlyFormat, setsToWin } = formatInfo;
  const totalSets = formatInfo.exactly || bestOf;

  // For "exactly" formats (exactly:N or bestOf:1), show all sets immediately
  // This is because we know the exact number of sets that will be played
  // For timed sets, scores don't determine winners, so all sets must be played
  // EXCEPT for aggregate scoring with conditional final tiebreak
  if (isExactlyFormat) {
    // Special case: Aggregate scoring with conditional final tiebreak (e.g., SET3XA-S:T10-F:TB1)
    const parsed = matchUpFormatCode.parse(matchUpFormat);
    const isAggregateScoring = !!parsed?.aggregate;
    const hasFinalTiebreak = parsed?.finalSetFormat?.tiebreakSet?.tiebreakTo !== undefined;
    const conditionalFinalTB = isAggregateScoring && hasFinalTiebreak && formatInfo.isTimed;
    // An aggregate exactly format plays all N timed sets; its TB is set N + 1, shown only when the
    // aggregate is tied after them. It is never one of the N (factory #5166; CA, 2026-10-04).
    const deciderSetNumber = conditionalFinalTB ? matchUpFormatCode.aggregateDeciderSetNumber(parsed) : undefined;

    // Don't expand beyond the exact number of sets (plus an aggregate format's decider)
    if (sets.length >= (deciderSetNumber ?? totalSets)) {
      return false;
    }

    if (conditionalFinalTB) {
      const timedSetsCount = deciderSetNumber ? deciderSetNumber - 1 : totalSets - 1;

      if (sets.length < timedSetsCount) {
        // Still need to show timed sets
        return true;
      } else if (sets.length === timedSetsCount) {
        // All timed sets entered, check if aggregate is tied
        const aggregateTotals = sets.reduce(
          (totals, set) => {
            if (set.side1Score !== undefined && set.side1Score !== null) {
              totals.side1 += set.side1Score;
            }
            if (set.side2Score !== undefined && set.side2Score !== null) {
              totals.side2 += set.side2Score;
            }
            return totals;
          },
          { side1: 0, side2: 0 }
        );

        // Only show final TB if aggregate is tied
        return aggregateTotals.side1 === aggregateTotals.side2;
      } else {
        // Already at or past totalSets
        return false;
      }
    }

    // Always show all sets for exactly formats (non-aggregate or no conditional TB)
    return true;
  }

  // For regular bestOf formats, use dynamic expansion based on scores
  // Calculate sets won per side
  const setsWon = { side1: 0, side2: 0 };

  sets.forEach((set) => {
    const s1 = set.side1Score ?? 0;
    const s2 = set.side2Score ?? 0;

    if (s1 > s2) setsWon.side1++;
    else if (s2 > s1) setsWon.side2++;
  });

  // Don't expand if match is already decided
  if (setsWon.side1 >= setsToWin || setsWon.side2 >= setsToWin) {
    return false;
  }

  // Don't expand beyond maximum sets
  if (sets.length >= bestOf) {
    return false;
  }

  // Check if all current sets are filled
  const allSetsFilled = sets.every(
    (set) =>
      set.side1Score !== undefined && set.side2Score !== undefined && set.side1Score !== null && set.side2Score !== null
  );

  // Expand if all sets filled and match not decided
  return allSetsFilled;
}

/**
 * Determine winner for aggregate scoring format
 */
function determineAggregateWinner(sets: SetScore[]): number | undefined {
  const aggregateTotals = sets.reduce(
    (totals, set) => {
      // Only count sets with actual scores (not tiebreak-only sets without side scores)
      if (set.side1Score !== undefined && set.side1Score !== null) {
        totals.side1 += set.side1Score;
      }
      if (set.side2Score !== undefined && set.side2Score !== null) {
        totals.side2 += set.side2Score;
      }
      return totals;
    },
    { side1: 0, side2: 0 }
  );

  if (aggregateTotals.side1 > aggregateTotals.side2) return 1;
  if (aggregateTotals.side2 > aggregateTotals.side1) return 2;

  // If aggregate is tied, check for final tiebreak set
  const finalSet = sets.at(-1);
  if (finalSet?.side1TiebreakScore !== undefined || finalSet?.side2TiebreakScore !== undefined) {
    const tb1 = finalSet.side1TiebreakScore ?? 0;
    const tb2 = finalSet.side2TiebreakScore ?? 0;
    if (tb1 > tb2) return 1;
    if (tb2 > tb1) return 2;
  }

  return undefined; // Tied aggregate, no tiebreak yet
}

/**
 * Determine the winning side based on set scores
 * Handles both regular scoring (sets won) and aggregate scoring (total points)
 */
export function determineWinningSide(sets: SetScore[], matchUpFormat?: string): number | undefined {
  if (!sets || sets.length === 0) return undefined;
  if (matchUpFormat && isOvertimeFormat(matchUpFormat)) return overtimeProgress(matchUpFormat, sets).winningSide;

  // Check if this is aggregate scoring
  const parsed = matchUpFormat ? matchUpFormatCode.parse(matchUpFormat) : null;
  const isAggregateScoring = !!parsed?.aggregate;

  if (isAggregateScoring) {
    return determineAggregateWinner(sets);
  }

  // Standard scoring: count sets won
  const { setsToWin } = parseMatchUpFormat(matchUpFormat);

  const setsWon = { side1: 0, side2: 0 };

  sets.forEach((set) => {
    const s1 = set.side1Score ?? 0;
    const s2 = set.side2Score ?? 0;

    if (s1 > s2) setsWon.side1++;
    else if (s2 > s1) setsWon.side2++;
  });

  if (setsWon.side1 >= setsToWin) return 1;
  if (setsWon.side2 >= setsToWin) return 2;

  return undefined;
}
