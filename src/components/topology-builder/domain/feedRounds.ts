/**
 * Feed Rounds — Compute which rounds in an elimination bracket are feed rounds
 * and how many positions feed in at each.
 *
 * Also provides lucky-draw-aware helpers for round count and loser computation.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';

const { LUCKY_DRAW, ROUND_ROBIN, AD_HOC } = drawDefinitionConstants;

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

/**
 * Compute round profiles for a lucky draw — mirrors the factory's luckyRoundProfiles().
 * Returns array of { participantsCount, preFeedRound, feedRound } per round.
 */
export function luckyRoundProfiles(
  drawSize: number,
): { participantsCount: number; preFeedRound: boolean; feedRound?: boolean }[] {
  const n = Math.max(2, drawSize);
  let participantsCount = n % 2 ? n + 1 : n;
  const preFeedRound = !!(Math.ceil(participantsCount / 2) % 2);
  const rounds: { participantsCount: number; preFeedRound: boolean; feedRound?: boolean }[] = [
    { participantsCount, preFeedRound },
  ];

  while (participantsCount > 2) {
    const nextRound = Math.ceil(participantsCount / 2);
    const nextIsFinal = nextRound === 1;
    const feedRound = !!(!nextIsFinal && nextRound % 2);
    participantsCount = !nextIsFinal && feedRound ? nextRound + 1 : nextRound;
    const pf = !!(participantsCount !== 2 && Math.ceil(participantsCount / 2) % 2);
    rounds.push({ participantsCount, preFeedRound: pf, feedRound });
  }

  return rounds;
}

/** Total rounds for a lucky draw structure. */
export function getLuckyDrawTotalRounds(drawSize: number): number {
  const n = Math.max(2, drawSize);
  if ((n & (n - 1)) === 0) return Math.ceil(Math.log2(n));
  return luckyRoundProfiles(drawSize).length;
}

/**
 * Number of losers that exit a lucky draw structure at a given round.
 * For pre-feed rounds, one lucky loser is retained → losers = matchUps - 1.
 * For non-pre-feed rounds, all losers exit → losers = matchUps.
 * In round 1, BYE positions don't produce real losers, so subtract BYEs.
 */
export function getLuckyDrawLosersForRound(drawSize: number, roundNumber: number): number {
  const n = Math.max(2, drawSize);
  if ((n & (n - 1)) === 0) {
    // Power of 2 → standard elimination
    return Math.floor(n / Math.pow(2, roundNumber));
  }
  const profiles = luckyRoundProfiles(drawSize);
  const idx = roundNumber - 1;
  if (idx < 0 || idx >= profiles.length) return 0;
  const { participantsCount, preFeedRound } = profiles[idx];
  const matchUps = participantsCount / 2;
  let losers = preFeedRound ? matchUps - 1 : matchUps;

  // Round 1: odd drawSize is padded to even, creating BYE matchUps that have no real loser
  if (roundNumber === 1 && n % 2 !== 0) {
    const byes = participantsCount - n;
    losers -= byes;
  }

  return losers;
}

/**
 * Structure-type-aware total rounds.
 * Dispatches to the correct algorithm based on structureType.
 */
export function getNodeTotalRounds(structureType: string, drawSize: number, structureOptions?: any): number {
  if (structureType === ROUND_ROBIN) {
    return (structureOptions?.groupSize || Math.min(drawSize, 4)) - 1;
  }
  if (structureType === AD_HOC) {
    return structureOptions?.roundsCount || 1;
  }
  if (structureType === LUCKY_DRAW) {
    return getLuckyDrawTotalRounds(drawSize);
  }
  return getTotalRounds(drawSize);
}

/**
 * Structure-type-aware losers count for a given round.
 * For elimination/feed-in: drawSize / 2^round
 * For lucky draw: uses luckyRoundProfiles
 */
export function getNodeLosersForRound(structureType: string, drawSize: number, roundNumber: number): number {
  if (structureType === LUCKY_DRAW) {
    return getLuckyDrawLosersForRound(drawSize, roundNumber);
  }
  return Math.floor(drawSize / Math.pow(2, roundNumber));
}
