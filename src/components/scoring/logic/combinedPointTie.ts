import { governors, matchUpFormatCode, scoreGovernor } from 'tods-competition-factory';

// constants and types
import type { SetScore } from '../types';

/**
 * A combined-point total that allows a tie (`SET1-S:P32`) can end level, 16–16: COMPLETED with no winner
 * (CA, 2026-10-11: ties are valid). The score dialogs otherwise finish a match only on a winner.
 *
 * The factory decides whether the set is over (`checkSetIsComplete` hands a combined-point set to its own
 * `analyzeCombinedPointSet`); this adds only that the format lets a tie stand and the totals are level. A
 * deciding-point or win-by format (`P32DP`, `P32WB2`) never ends level, so it is never a completed tie.
 */
export function isCompletedCombinedPointTie(sets: SetScore[], matchUpFormat?: string): boolean {
  const setFormat = matchUpFormatCode.parse(matchUpFormat ?? '')?.setFormat;
  if (!setFormat?.combinedPointTotal || setFormat.tieResolution !== 'ALLOW') return false;
  if (sets.length !== 1) return false;

  const [set] = sets;
  if (set.side1Score === undefined || set.side1Score !== set.side2Score) return false;
  return governors.scoreGovernor.checkSetIsComplete({ set, matchUpFormat, isDecidingSet: true }) === true;
}

/**
 * A match the factory completes with no winner: the combined-point tie above, and (factory 7.16, #5612)
 * an exactly or aggregate count that closes level with no declared decider, such as `HAL2X-S:TB11` at one
 * half each or `SET2XA-S:T10` level on games. The score dialogs judge completion by a winner, so they ask
 * the factory: the entered sets are played through its ScoringEngine as set totals, and the result is a
 * tie when the engine completes the match and names no winner. A set the engine refuses or ignores (one
 * past the close) is not a completed tie.
 */
export function isCompletedLevelClose(sets: SetScore[], matchUpFormat?: string): boolean {
  if (isCompletedCombinedPointTie(sets, matchUpFormat)) return true;
  if (!matchUpFormat || !sets.length || !matchUpFormatCode.parse(matchUpFormat)) return false;

  try {
    const engine = new scoreGovernor.ScoringEngine({ matchUpFormat });
    for (const set of sets) {
      const total = setTotal(set);
      if (engine.isComplete() || !total) return false;
      if (engine.addSet(total)?.recorded === false) return false;
    }
    return engine.isComplete() && engine.getWinner() == null;
  } catch {
    return false;
  }
}

/**
 * A dialog set as the engine's set total. A tiebreak-only set (`[11-5]`) carries only its tiebreak
 * scores; the engine holds it as the segment won 1-0 with those points, as it does when it is scored.
 */
function setTotal(set: SetScore) {
  const { side1TiebreakScore: tb1, side2TiebreakScore: tb2 } = set;
  const tiebreaks = {
    ...(tb1 !== undefined && { side1TiebreakScore: tb1 }),
    ...(tb2 !== undefined && { side2TiebreakScore: tb2 })
  };
  if (set.side1Score !== undefined && set.side2Score !== undefined)
    return { side1Score: set.side1Score, side2Score: set.side2Score, ...tiebreaks };
  if (tb1 === undefined || tb2 === undefined) return undefined;
  return { side1Score: tb1 > tb2 ? 1 : 0, side2Score: tb2 > tb1 ? 1 : 0, ...tiebreaks };
}
