/**
 * Determine whether a structure should be rendered as a "lucky draw" (no connecting lines).
 *
 * A lucky draw has irregular round sizes that don't follow standard elimination halving.
 * Qualifying structures often have non-power-of-2 round sizes (e.g., 24→12→6) but are
 * still standard single elimination — they just don't resolve to a single winner.
 *
 * Feed-in rounds (where the matchUp count stays the same between consecutive rounds)
 * are also a valid elimination pattern.
 */
import type { RoundProfile } from 'tods-competition-factory';

interface IsLuckyDrawParams {
  roundsNotPowerOf2?: boolean;
  hasNoRoundPositions?: boolean;
  roundNumbers?: number[];
  roundProfile?: RoundProfile;
}

export function isLuckyDraw({ roundsNotPowerOf2, hasNoRoundPositions, roundNumbers, roundProfile }: IsLuckyDrawParams): boolean {
  if (hasNoRoundPositions) return true;
  if (!roundsNotPowerOf2) return false;

  // Non-power-of-2 round counts are still standard elimination if each round
  // halves (or stays equal for feed rounds) relative to the previous round.
  const consistentElimination =
    roundNumbers &&
    roundNumbers.length > 1 &&
    roundProfile &&
    roundNumbers.every((rn, i) => {
      if (i === 0) return true;
      const prev = roundProfile[roundNumbers[i - 1]]?.matchUpsCount;
      const curr = roundProfile[rn]?.matchUpsCount;
      return prev && curr && (curr === prev / 2 || curr === prev);
    });

  return !consistentElimination;
}
