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
export declare function isRoundProfileEditable(drawSize: number): boolean;
/**
 * Ceil-halving cascade from drawSize / 2 down to 1 — what a LUCKY_DRAW with no explicit profile plays. drawSize 40 →
 * [20, 10, 5, 3, 2, 1]; 32 → [16, 8, 4, 2, 1]. [] for an odd or sub-2 drawSize.
 */
export declare function defaultProfile(drawSize: number): number[];
/** Lucky losers the round after `previous` needs: its slots (2 × next) minus the previous round's winners. */
export declare function luckyLosersNeeded(previous: number, next: number): number;
/** The range a round's matchUps count may take after a round of `previous` matchUps: no winner dropped, no growth. */
export declare function roundRange(previous: number): {
    min: number;
    max: number;
};
/**
 * Clamp a supplied profile into the valid range for drawSize: a first round that is not drawSize / 2 gets the default;
 * every later round is clamped into `roundRange` of the one before; values past the first 1 are dropped; a profile that
 * stops short of 1 is extended by ceil-halving.
 */
export declare function sanitizeProfile(profile: number[], drawSize: number): number[];
/**
 * Set round `index` (0-based) to `value`, clamped into its range, and re-default every later round by ceil-halving from
 * it. The first round (fixed by drawSize) and the final (always 1) cannot be set.
 */
export declare function setRound(profile: number[], index: number, value: number): number[];
export type RoundProfileProblem = {
    code: 'EVEN_DRAW_SIZE_REQUIRED';
    drawSize: number;
} | {
    code: 'MUST_END_AT_ONE';
} | {
    code: 'FIRST_ROUND_MISMATCH';
    firstRoundSlots: number;
    drawSize: number;
} | {
    code: 'DROPS_WINNERS';
    round: number;
    slots: number;
    winners: number;
} | {
    code: 'EXCEEDS_PREVIOUS_ROUND';
    round: number;
    matchUps: number;
    previous: number;
};
/**
 * The first problem with a profile, or undefined when the factory will generate it. Same rules as the factory's
 * `validateRoundProfile`, plus one the factory leaves implicit: a round cannot have more matchUps than the round before
 * it, since its lucky losers come from that round's losers.
 */
export declare function validateRoundProfile(profile: number[], drawSize: number): RoundProfileProblem | undefined;
/**
 * Losers who leave the draw in round `roundNumber` (1-based): the round's matchUps, less the lucky losers the next
 * round takes back from them. The final's loser leaves; a round past the profile has none.
 */
export declare function losersLeavingRound(profile: number[], roundNumber: number): number;
