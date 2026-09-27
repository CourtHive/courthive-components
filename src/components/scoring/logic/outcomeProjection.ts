/**
 * Carrying an in-progress entry across an approach switch.
 *
 * The scoring modal offers four ways to enter the same result, and the switcher is meant to be a
 * live control — a director who starts in Dynamic Sets and wants the Dial Pad should not lose what
 * they have typed. It did: `switchApproach` nulled the outcome and `renderApproach` handed the next
 * approach the ORIGINAL saved matchUp, so rotating restored the stored result and discarded the edit.
 *
 * ── Why this is a projection and not a second hydration path ──
 *
 * All three score approaches already hydrate the same way on mount:
 *
 *     let internalScore = matchUp.score ? { ...matchUp.score } : undefined;
 *
 * and each says in its own comment that it then "NEVER reference[s] matchUp.score again". So the
 * next approach does not need to learn where an in-progress outcome lives — it needs to be handed a
 * matchUp that already carries one. Teaching four DOM renderers a second source is exactly how the
 * forward walkover rule came to have three disagreeing copies; one pure function is the alternative
 * that a test can hold.
 *
 * No DOM, no side effects, and the input is never mutated.
 */

import type { ScoreOutcome } from '../types';

/** The fields a projection may replace. Everything else on the matchUp is carried through as-is. */
type ProjectableMatchUp = {
  score?: any;
  matchUpStatus?: string;
  winningSide?: number;
  [key: string]: any;
};

/**
 * The matchUp the next approach should hydrate from.
 *
 * Returns the original when there is nothing in progress to carry — the ordinary case on first open,
 * where the saved matchUp IS the truth.
 *
 * ── `winningSide` takes no fallback, and that is the whole care of this function ──
 *
 * It is read from the outcome and never from the saved matchUp. If the operator has cleared the
 * score, the outcome carries no winner, and falling back to the stored one would put back a winner
 * they had just removed — an unanswered question read as a particular answer, which is the fail-open
 * shape (Mentat architectural standard A3) that `irregularEnding.ts` exists to prevent, one field
 * over. `score` and `matchUpStatus` DO fall back, because an outcome that asserts neither is not
 * claiming the match has no score or no status; it is simply not speaking about them.
 */
export function projectOutcomeOntoMatchUp<T extends ProjectableMatchUp>(matchUp: T, outcome?: ScoreOutcome | null): T {
  // Nothing typed yet, or an outcome that asserts nothing at all: the saved matchUp is still the
  // truth, and returning it untouched keeps first-open behaviour exactly as it was.
  if (!outcome || (!outcome.scoreObject && !outcome.matchUpStatus && outcome.winningSide === undefined)) {
    return matchUp;
  }

  const projected: T = { ...matchUp };

  if (outcome.scoreObject) projected.score = outcome.scoreObject;
  if (outcome.matchUpStatus) projected.matchUpStatus = outcome.matchUpStatus;
  projected.winningSide = outcome.winningSide;

  return projected;
}
