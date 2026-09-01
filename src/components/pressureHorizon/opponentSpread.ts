/**
 * The spread of opponents a participant could meet in a round.
 *
 * The walls renderer reads only `expected` and throws the rest away. A ribbon can
 * carry the whole distribution, and the distribution is the interesting part: at
 * round 1 the opponent is known and the spread is a point, and from round 2 it is
 * a real range that the shading can show.
 *
 * **Why two envelopes rather than one.** `opponentEloRange` on the projection is a
 * min/max over every opponent clearing `DEFAULT_RANGE_THRESHOLD`, which is `0.01`
 * — a one-percent long shot widens it as much as the favourite does. Measured on a
 * 16-draw, that envelope averages 417 points at round 3 against a ±668 domain, so
 * drawing it alone would say "almost anyone" for every participant and distinguish
 * nobody.
 *
 * So the outer envelope keeps that honest full range at low opacity, and an inner
 * envelope carries the weighted interquartile range — where the arrival probability
 * actually sits. The pair reads as a fan: dense where the outcome is likely, faint
 * where it is merely possible.
 */

// constants and types
import type { PossibleOpponent } from '../pressureChart/types';

/** Default inner-envelope quantiles. The middle half of the arrival probability. */
export const INNER_QUANTILES: [number, number] = [0.25, 0.75];

export type OpponentSpread = {
  /** Full range over opponents clearing the projection's threshold. */
  outerLow: number;
  outerHigh: number;
  /** Weighted interquartile range — where the probability mass sits. */
  innerLow: number;
  innerHigh: number;
};

/**
 * Weighted quantile over (value, weight) pairs, values ascending.
 *
 * Uses the inclusive definition — walk the cumulative weight and take the first
 * value whose running total reaches `q` of the total. With a single opponent every
 * quantile is that opponent, which is what makes round 1 collapse to a point rather
 * than to an arbitrary interval.
 */
export function weightedQuantile(sorted: { value: number; weight: number }[], q: number): number | null {
  if (!sorted.length) return null;
  const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  if (!(total > 0)) return sorted[0].value;

  const target = q * total;
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= target) return entry.value;
  }
  return sorted[sorted.length - 1].value;
}

/**
 * Derive both envelopes from the opponents who could arrive.
 *
 * Returns `null` when nobody in the pool carries a rating — the caller is expected
 * to fall back to the projection's own `low`/`high`, and to draw nothing at all if
 * that is absent too. Never invents a spread.
 */
export function opponentSpread(opponents: PossibleOpponent[], quantiles = INNER_QUANTILES): OpponentSpread | null {
  const rated = opponents
    .filter((opponent): opponent is PossibleOpponent & { elo: number } => typeof opponent.elo === 'number')
    .map((opponent) => ({ value: opponent.elo, weight: Math.max(0, opponent.probability) }))
    .toSorted((a, b) => a.value - b.value);

  if (!rated.length) return null;

  const innerLow = weightedQuantile(rated, quantiles[0]);
  const innerHigh = weightedQuantile(rated, quantiles[1]);
  if (innerLow === null || innerHigh === null) return null;

  return {
    outerLow: rated[0].value,
    outerHigh: rated[rated.length - 1].value,
    // Quantiles come back in ascending order by construction, but a caller-supplied
    // pair could be given the other way round; sort rather than trust it.
    innerLow: Math.min(innerLow, innerHigh),
    innerHigh: Math.max(innerLow, innerHigh)
  };
}
