import { PossibleOpponent } from '../pressureChart/types';
/** Default inner-envelope quantiles. The middle half of the arrival probability. */
export declare const INNER_QUANTILES: [number, number];
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
export declare function weightedQuantile(sorted: {
    value: number;
    weight: number;
}[], q: number): number | null;
/**
 * Derive both envelopes from the opponents who could arrive.
 *
 * Returns `null` when nobody in the pool carries a rating — the caller is expected
 * to fall back to the projection's own `low`/`high`, and to draw nothing at all if
 * that is absent too. Never invents a spread.
 */
export declare function opponentSpread(opponents: PossibleOpponent[], quantiles?: [number, number]): OpponentSpread | null;
