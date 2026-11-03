import { SetScore } from '../types';
/**
 * A combined-point total that allows a tie (`SET1-S:P32`) can end level, 16–16: COMPLETED with no winner
 * (CA, 2026-10-11: ties are valid). The score dialogs otherwise finish a match only on a winner.
 *
 * The factory decides whether the set is over (`checkSetIsComplete` hands a combined-point set to its own
 * `analyzeCombinedPointSet`); this adds only that the format lets a tie stand and the totals are level. A
 * deciding-point or win-by format (`P32DP`, `P32WB2`) never ends level, so it is never a completed tie.
 */
export declare function isCompletedCombinedPointTie(sets: SetScore[], matchUpFormat?: string): boolean;
/**
 * A match the factory completes with no winner: the combined-point tie above, and (factory 7.16, #5612)
 * an exactly or aggregate count that closes level with no declared decider, such as `HAL2X-S:TB11` at one
 * half each or `SET2XA-S:T10` level on games. The score dialogs judge completion by a winner, so they ask
 * the factory: the entered sets are played through its ScoringEngine as set totals, and the result is a
 * tie when the engine completes the match and names no winner. A set the engine refuses or ignores (one
 * past the close) is not a completed tie.
 */
export declare function isCompletedLevelClose(sets: SetScore[], matchUpFormat?: string): boolean;
