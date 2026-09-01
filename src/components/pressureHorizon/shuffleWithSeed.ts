/**
 * Deterministic shuffling for the draw-order game.
 *
 * `Math.random()` is deliberately not used. A puzzle has to be reproducible: the
 * same seed must always deal the same board so two people can be given the same
 * one to race on, a score can be quoted against an identifiable puzzle, and the
 * shuffle can be asserted in a unit test rather than described in a comment.
 */

/** mulberry32 — small, fast, and good enough for dealing a board. Not cryptographic. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates against a seeded stream. Non-mutating. */
export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  const next = createRandom(seed);
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

/** How many items a shuffle left sitting in their original slot. */
export function fixedPoints<T>(items: readonly T[], shuffled: readonly T[]): number {
  return shuffled.filter((item, index) => item === items[index]).length;
}

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
export function shuffleDeranged<T>(
  items: readonly T[],
  seed: number,
  attempts = 32
): { items: T[]; seed: number; deranged: boolean } {
  if (items.length < 2) return { items: [...items], seed, deranged: false };

  let best: { items: T[]; seed: number; fixed: number } | undefined;
  for (let offset = 0; offset < attempts; offset++) {
    const candidateSeed = seed + offset;
    const shuffled = shuffleWithSeed(items, candidateSeed);
    const fixed = fixedPoints(items, shuffled);
    if (fixed === 0) return { items: shuffled, seed: candidateSeed, deranged: true };
    if (!best || fixed < best.fixed) best = { items: shuffled, seed: candidateSeed, fixed };
  }

  // Only reachable with `attempts` < 1, i.e. a caller that asked for no attempts.
  if (!best) return { items: shuffleWithSeed(items, seed), seed, deranged: false };
  return { items: best.items, seed: best.seed, deranged: false };
}
