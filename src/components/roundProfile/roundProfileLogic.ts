/**
 * Round profiles for a LUCKY_DRAW: how many matchUps each round has, from the first round down to the final.
 *
 * A profile is the factory's `roundProfile` (`generateDrawDefinition({ drawType: LUCKY_DRAW, roundProfile })`, handled
 * by its `customLuckyDraw`). Lucky losers fill the gap between a round's winners and the next round's slots:
 *
 *   luckyLosersNeeded(n → n+1) = 2 * profile[n+1] - profile[n]
 *
 * e.g. drawSize 40 as [20, 12, 8, 4, 2, 1]: R1 → R2 takes 4 lucky losers (20 winners + 4 = 24 = 12 × 2), R2 → R3
 * takes 4, the rest halve cleanly.
 *
 * Pure functions only — the editor (`roundProfileEditor.ts`), the topology builder and the tests share them, so the
 * rules live in one place. `validateRoundProfile` mirrors the factory's own validation, so a profile accepted here is
 * one the factory will generate.
 */

/** An explicit profile needs an even drawSize: its first round is drawSize / 2 matchUps. */
export function isRoundProfileEditable(drawSize: number): boolean {
  return Number.isInteger(drawSize) && drawSize >= 2 && drawSize % 2 === 0;
}

/**
 * Ceil-halving cascade from drawSize / 2 down to 1 — what a LUCKY_DRAW with no explicit profile plays. drawSize 40 →
 * [20, 10, 5, 3, 2, 1]; 32 → [16, 8, 4, 2, 1]. [] for an odd or sub-2 drawSize.
 */
export function defaultProfile(drawSize: number): number[] {
  if (!isRoundProfileEditable(drawSize)) return [];
  const result: number[] = [];
  let current = drawSize / 2;
  result.push(current);
  while (current > 1) {
    current = Math.max(1, Math.ceil(current / 2));
    result.push(current);
  }
  return result;
}

/** Lucky losers the round after `previous` needs: its slots (2 × next) minus the previous round's winners. */
export function luckyLosersNeeded(previous: number, next: number): number {
  return Math.max(0, 2 * next - previous);
}

/** The range a round's matchUps count may take after a round of `previous` matchUps: no winner dropped, no growth. */
export function roundRange(previous: number): { min: number; max: number } {
  return { min: Math.ceil(previous / 2), max: previous };
}

/**
 * Clamp a supplied profile into the valid range for drawSize: a first round that is not drawSize / 2 gets the default;
 * every later round is clamped into `roundRange` of the one before; values past the first 1 are dropped; a profile that
 * stops short of 1 is extended by ceil-halving.
 */
export function sanitizeProfile(profile: number[], drawSize: number): number[] {
  if (!isRoundProfileEditable(drawSize)) return [];
  if (!profile?.length || profile[0] !== drawSize / 2) return defaultProfile(drawSize);
  const result: number[] = [profile[0]];
  for (let i = 1; i < profile.length; i++) {
    const prev = result[result.length - 1];
    if (prev === 1) break;
    const { min, max } = roundRange(prev);
    result.push(Math.max(min, Math.min(max, profile[i])));
  }
  while (result[result.length - 1] > 1) {
    result.push(Math.max(1, Math.ceil(result[result.length - 1] / 2)));
  }
  return result;
}

/**
 * Set round `index` (0-based) to `value`, clamped into its range, and re-default every later round by ceil-halving from
 * it. The first round (fixed by drawSize) and the final (always 1) cannot be set.
 */
export function setRound(profile: number[], index: number, value: number): number[] {
  if (index <= 0 || index >= profile.length - 1) return [...profile];
  const { min, max } = roundRange(profile[index - 1]);
  const result = profile.slice(0, index);
  result.push(Math.max(min, Math.min(max, value)));
  while (result[result.length - 1] > 1) {
    result.push(Math.max(1, Math.ceil(result[result.length - 1] / 2)));
  }
  return result;
}

export type RoundProfileProblem =
  | { code: 'EVEN_DRAW_SIZE_REQUIRED'; drawSize: number }
  | { code: 'MUST_END_AT_ONE' }
  | { code: 'FIRST_ROUND_MISMATCH'; firstRoundSlots: number; drawSize: number }
  | { code: 'DROPS_WINNERS'; round: number; slots: number; winners: number }
  | { code: 'EXCEEDS_PREVIOUS_ROUND'; round: number; matchUps: number; previous: number };

/**
 * The first problem with a profile, or undefined when the factory will generate it. Same rules as the factory's
 * `validateRoundProfile`, plus one the factory leaves implicit: a round cannot have more matchUps than the round before
 * it, since its lucky losers come from that round's losers.
 */
export function validateRoundProfile(profile: number[], drawSize: number): RoundProfileProblem | undefined {
  if (!isRoundProfileEditable(drawSize)) return { code: 'EVEN_DRAW_SIZE_REQUIRED', drawSize };
  if (!profile?.length || profile[profile.length - 1] !== 1) return { code: 'MUST_END_AT_ONE' };
  if (profile[0] * 2 !== drawSize) return { code: 'FIRST_ROUND_MISMATCH', firstRoundSlots: profile[0] * 2, drawSize };
  for (let i = 0; i < profile.length - 1; i++) {
    if (2 * profile[i + 1] < profile[i]) {
      return { code: 'DROPS_WINNERS', round: i + 2, slots: profile[i + 1] * 2, winners: profile[i] };
    }
    if (profile[i + 1] > profile[i]) {
      return { code: 'EXCEEDS_PREVIOUS_ROUND', round: i + 2, matchUps: profile[i + 1], previous: profile[i] };
    }
  }
  return undefined;
}

/**
 * Losers who leave the draw in round `roundNumber` (1-based): the round's matchUps, less the lucky losers the next
 * round takes back from them. The final's loser leaves; a round past the profile has none.
 */
export function losersLeavingRound(profile: number[], roundNumber: number): number {
  const index = roundNumber - 1;
  if (index < 0 || index >= profile.length) return 0;
  const matchUps = profile[index];
  const next = profile[index + 1];
  return next === undefined ? matchUps : matchUps - luckyLosersNeeded(matchUps, next);
}
