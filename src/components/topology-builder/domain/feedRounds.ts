/**
 * Feed Rounds — Compute which rounds in an elimination bracket are feed rounds
 * and how many positions feed in at each.
 */

/**
 * For a given drawSize, return a Map from round number → feed capacity.
 * Feed rounds are the extra rounds inserted when drawSize > nearest power of 2.
 *
 * Example: drawSize=36, base=32, feedIn=4
 *   → { 4 → 4 }  (feed round 4 has capacity 4)
 */
export function getFeedRoundCapacities(drawSize: number): Map<number, number> {
  const n = Math.max(2, drawSize);
  const base = Math.pow(2, Math.floor(Math.log2(n)));
  const feedIn = n - base;
  if (feedIn <= 0) return new Map();

  const result = new Map<number, number>();
  let roundNumber = 0;
  let mc = base / 2;
  while (mc >= 1) {
    roundNumber++; // regular round
    if (feedIn & mc) {
      roundNumber++; // feed round
      result.set(roundNumber, mc);
    }
    mc = Math.floor(mc / 2);
  }
  return result;
}

/**
 * Total number of rounds for a given drawSize, including feed rounds.
 * Equivalent to getNumRounds but works with drawSize directly.
 */
export function getTotalRounds(drawSize: number): number {
  const n = Math.max(2, drawSize);
  const base = Math.pow(2, Math.floor(Math.log2(n)));
  const feedIn = n - base;
  let numRounds = 0;
  let mc = base / 2;
  while (mc >= 1) {
    numRounds++;
    if (feedIn & mc) numRounds++;
    mc = Math.floor(mc / 2);
  }
  return numRounds;
}
