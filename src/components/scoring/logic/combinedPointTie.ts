import { governors, matchUpFormatCode } from 'tods-competition-factory';

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
