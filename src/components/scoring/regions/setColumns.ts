/**
 * Labels for the score columns.
 *
 * Shared by every region that renders per-set columns, so the Dial Pad and Dynamic Sets cannot end up
 * heading the same column differently.
 */

/**
 * The column heading for a set: `1st`, `2nd`, `3rd`, `4th`, `5th`.
 *
 * CA, 2026-09-27, replacing `SET 1` / `SET 2` / `SET 3`. Shorter matters here for a reason beyond
 * taste: the heading sits above a 62px column, and `SET 1` is wide enough that shrinking the column
 * on a narrow viewport would either clip it or force the 44px input below its minimum target.
 *
 * The teens are handled even though a match will never have eleven sets, because an ordinal function
 * that is wrong for 11 is simply a wrong ordinal function, and the next caller will not check.
 */
export function ordinalSetLabel(setNumber: number): string {
  const teens = setNumber % 100;
  if (teens >= 11 && teens <= 13) return `${setNumber}th`;

  switch (setNumber % 10) {
    case 1:
      return `${setNumber}st`;
    case 2:
      return `${setNumber}nd`;
    case 3:
      return `${setNumber}rd`;
    default:
      return `${setNumber}th`;
  }
}
