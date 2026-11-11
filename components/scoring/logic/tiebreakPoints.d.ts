/**
 * Which side of a tiebreak set shows its tiebreak points.
 *
 * CA, 2026-11-11: *"It is standard to only show the tiebreak points for the losing side, so 7-6(0) is
 * assumed to be 7-6(7-0) and 7-6(9) is assumed to be 7-6(11-9) with the standard SET3-S:6/TB7."* And:
 * *"if we don't have both tiebreak values just show the games score (for a tiebreak set we must have
 * both values, I'd assume)"*.
 *
 * Both surfaces raise the LOWER of two values on its own side, by `lowerTiebreakPoints`. They differ
 * only on a LONE value, deliberately:
 *
 * - **Entry feedback** (the scoring dialog: Dynamic Sets' fold, the Free Score / Dial Pad readouts)
 *   uses `lowerTiebreakPoints`, which shows a lone value on its own side. The dialog reaches a lone value
 *   in normal use — mid-entry, and whenever Dynamic Sets' Smart complement is off — and hiding it would
 *   hide what the operator just typed.
 * - **Stored display** (the draw cell, `renderStructure/sideScoreModel`) uses `settledTiebreakPoints`,
 *   which raises nothing unless both values are recorded: a stored tiebreak set must carry both, so a
 *   lone value is incomplete data, and the cell shows the games alone.
 */
/**
 * Entry feedback: a side's tiebreak points to raise, or `undefined` when that side raises none.
 *
 * - The LOWER of the two shows, on its own side; the winner's are implied by the format.
 * - A lone value (only one side's points typed so far) shows on its own side.
 * - Equal values show on NEITHER side. A tiebreak is won by two, so a tie is not a finished tiebreak
 *   and has no loser to annotate; raising both would print a result that cannot have happened.
 */
export declare function lowerTiebreakPoints(mine: number | undefined, theirs: number | undefined): number | undefined;
/**
 * Stored display: as `lowerTiebreakPoints`, but only when BOTH sides' points are recorded. With either
 * missing, neither side raises anything.
 */
export declare function settledTiebreakPoints(mine: number | undefined, theirs: number | undefined): number | undefined;
