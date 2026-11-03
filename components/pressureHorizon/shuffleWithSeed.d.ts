/**
 * Deterministic shuffling for the draw-order game.
 *
 * `Math.random()` is deliberately not used. A puzzle has to be reproducible: the
 * same seed must always deal the same board so two people can be given the same
 * one to race on, a score can be quoted against an identifiable puzzle, and the
 * shuffle can be asserted in a unit test rather than described in a comment.
 */
/** mulberry32 — small, fast, and good enough for dealing a board. Not cryptographic. */
export declare function createRandom(seed: number): () => number;
/** Fisher-Yates against a seeded stream. Non-mutating. */
export declare function shuffleWithSeed<T>(items: readonly T[], seed: number): T[];
/** How many items a shuffle left sitting in their original slot. */
export declare function fixedPoints<T>(items: readonly T[], shuffled: readonly T[]): number;
/**
 * A shuffle that actually looks shuffled.
 *
 * A plain shuffle leaves roughly one item in place on average, and a board that
 * opens with three rows already correct is a worse puzzle than one that opens
 * with none — the player cannot tell luck from deduction. So walk consecutive
 * seeds until a derangement turns up, and if none does inside `attempts`, take
 * the best of what was seen and **report which seed produced it** so the board
 * stays reproducible either way.
 *
 * Fewer than two items cannot be deranged; that is returned as-is rather than
 * spun on, with `deranged: false` so the caller is never told a fiction.
 */
export declare function shuffleDeranged<T>(items: readonly T[], seed: number, attempts?: number): {
    items: T[];
    seed: number;
    deranged: boolean;
};
