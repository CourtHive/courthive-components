/**
 * The score line, formatted by the FACTORY.
 *
 * CA, 2026-09-28: *"you should use generateScoreString and not invent something new for the modal."*
 *
 * Every region used to format its own, and they diverged — which is the whole argument for this file
 * existing rather than three copies of a rule. Measured 2026-09-28, before the swap:
 *
 * | case | Dynamic Sets | Dial Pad | `generateScoreString` |
 * |---|---|---|---|
 * | a set won on a tiebreak | `7-6(3)` | **`7-6(7)`** | `7-6(3)` |
 * | a match tiebreak (`SET1-S:TB10`) | `10-8` | **`0-0`** | `[10-8]` |
 *
 * The keypad was showing the tiebreak WINNER's points, and reading the GAMES of a tiebreak-only set —
 * which are 0-0 by construction, since `buildSetScore` puts the points in the tiebreak fields. Dynamic
 * Sets had a special case for the second and took the minimum for the first; the keypad had neither.
 * Two implementations, two different bugs, and the same keystrokes producing different score lines
 * depending on which approach happened to be open.
 *
 * ── The one change a reader will notice ──
 *
 * A match tiebreak now reads **`[10-8]`**, in brackets. That is the factory's own convention for a
 * tiebreak-only set and what every other score line in the ecosystem shows, so the card agreeing with
 * it is the point rather than a side effect.
 */

import { scoreGovernor } from 'tods-competition-factory';

import type { SetScore } from '../types';

export function scoreLine(sets: SetScore[], matchUpFormat?: string): string | undefined {
  if (!sets.length) return undefined;

  // `setTBlast` is left at its default of TRUE — the tiebreak last — and that is a measured choice, not
  // an omission. It changes nothing while side 1 wins the set, which is why it looked arbitrary; when
  // SIDE 2 wins one, measured 2026-09-28:
  //
  //   setTBlast: false  →  `6(3)-7`   the parenthetical lands mid-line, after the losing games
  //   default (true)    →  `6-7(3)`   the conventional reading
  //
  // The line is in SIDE order, so side 2 wins sets in it routinely. `winningSide` is deliberately not
  // passed for the same reason: with it, `winnerFirst` reorders the sides so the winner's games come
  // first, and this line sits directly beneath two rows labelled side 1 and side 2.
  const result = scoreGovernor.generateScoreString({ sets, matchUpFormat });

  // It returns `{ error }` rather than throwing when it cannot read the sets. An empty string is the
  // honest answer for "nothing yet" and reaches the band as no score rather than as an empty quote.
  if (typeof result !== 'string') return undefined;
  return result || undefined;
}
