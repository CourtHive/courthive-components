/**
 * Feed Rounds — Compute which rounds in an elimination bracket are feed rounds
 * and how many positions feed in at each.
 *
 * Also provides lucky-draw-aware helpers for round count and loser computation.
 */
import { losersLeavingRound, validateRoundProfile } from '../../roundProfile/roundProfileLogic';
import { drawDefinitionConstants } from 'tods-competition-factory';

const { LUCKY_DRAW, ROUND_ROBIN, AD_HOC } = drawDefinitionConstants;

/**
 * A FEED_IN structure's explicit feed rounds (`structureOptions.feedRoundsProfile`), when they describe a draw of
 * `drawSize`: each the size of one of the base draw's rounds, adding up to what `drawSize` adds to its base. The
 * factory refuses any other profile (`isValidFeedRoundsProfile`), so the builder shows the default shape instead.
 */
export function feedRoundsProfileOf(drawSize: number, structureOptions?: any): number[] | undefined {
  const profile = structureOptions?.feedRoundsProfile;
  if (!Array.isArray(profile) || !profile.length) return undefined;
  const base = Math.pow(2, Math.floor(Math.log2(Math.max(2, drawSize))));
  const baseRounds = new Set<number>();
  for (let mc = base / 2; mc >= 1; mc = Math.floor(mc / 2)) baseRounds.add(mc);
  const fed = profile.reduce((sum, size) => sum + (Number.isInteger(size) ? size : NaN), 0);
  return profile.every((size) => baseRounds.has(size)) && fed === drawSize - base ? profile : undefined;
}

/**
 * An elimination structure's rounds, largest first: the base draw's rounds, each followed by the feed rounds of its
 * size. By default a feed round follows each base round whose size is a bit of what `drawSize` adds to its base (36:
 * one feed round of 4); a feed rounds profile names them instead (48 as [8, 8]: 16, 8, 8 fed, 8 fed, 4, 2, 1).
 */
export function eliminationRounds(drawSize: number, structureOptions?: any): { count: number; isFeed: boolean }[] {
  const n = Math.max(2, drawSize);
  const base = Math.pow(2, Math.floor(Math.log2(n)));
  const feedIn = n - base;
  const profile = feedRoundsProfileOf(n, structureOptions);
  const rounds: { count: number; isFeed: boolean }[] = [];
  for (let mc = base / 2; mc >= 1; mc = Math.floor(mc / 2)) {
    rounds.push({ count: mc, isFeed: false });
    const feeds = profile ? profile.filter((size) => size === mc).length : feedIn & mc ? 1 : 0;
    for (let f = 0; f < feeds; f++) rounds.push({ count: mc, isFeed: true });
  }
  return rounds;
}

/**
 * For a given drawSize, return a Map from round number → feed capacity.
 * Feed rounds are the extra rounds inserted when drawSize > nearest power of 2.
 *
 * Example: drawSize=36, base=32, feedIn=4
 *   → { 4 → 4 }  (feed round 4 has capacity 4)
 * With a feed rounds profile: drawSize=48 as [8, 8] → { 3 → 8, 4 → 8 }
 */
export function getFeedRoundCapacities(drawSize: number, structureOptions?: any): Map<number, number> {
  const result = new Map<number, number>();
  eliminationRounds(drawSize, structureOptions).forEach(({ count, isFeed }, i) => {
    if (isFeed) result.set(i + 1, count);
  });
  return result;
}

/**
 * Total number of rounds for a given drawSize, including feed rounds.
 * Equivalent to getNumRounds but works with drawSize directly.
 */
export function getTotalRounds(drawSize: number, structureOptions?: any): number {
  return eliminationRounds(drawSize, structureOptions).length;
}

/**
 * Compute round profiles for a lucky draw — mirrors the factory's luckyRoundProfiles().
 * Returns array of { participantsCount, preFeedRound, feedRound } per round.
 */
export function luckyRoundProfiles(
  drawSize: number
): { participantsCount: number; preFeedRound: boolean; feedRound?: boolean }[] {
  const n = Math.max(2, drawSize);
  let participantsCount = n % 2 ? n + 1 : n;
  const preFeedRound = !!(Math.ceil(participantsCount / 2) % 2);
  const rounds: { participantsCount: number; preFeedRound: boolean; feedRound?: boolean }[] = [
    { participantsCount, preFeedRound }
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
 * A lucky draw's explicit round profile (`structureOptions.roundProfile`, the factory's `roundProfile`), when it is one
 * the factory will generate; otherwise undefined and the default cascade applies. An invalid profile is never half-used:
 * the validator reports it, and every count here falls back to what the factory would play without it.
 */
export function customLuckyProfile(drawSize: number, structureOptions?: any): number[] | undefined {
  const profile = structureOptions?.roundProfile;
  if (!Array.isArray(profile) || !profile.length) return undefined;
  return validateRoundProfile(profile, drawSize) ? undefined : profile;
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
    return customLuckyProfile(drawSize, structureOptions)?.length ?? getLuckyDrawTotalRounds(drawSize);
  }
  return getTotalRounds(drawSize, structureOptions);
}

/**
 * Structure-type-aware losers count for a given round.
 * For elimination/feed-in: drawSize / 2^round
 * For lucky draw: an explicit round profile's losers less the lucky losers the next round takes back, else the
 * default cascade (luckyRoundProfiles)
 */
export function getNodeLosersForRound(
  structureType: string,
  drawSize: number,
  roundNumber: number,
  structureOptions?: any
): number {
  if (structureType === LUCKY_DRAW) {
    const profile = customLuckyProfile(drawSize, structureOptions);
    return profile ? losersLeavingRound(profile, roundNumber) : getLuckyDrawLosersForRound(drawSize, roundNumber);
  }
  return Math.floor(drawSize / Math.pow(2, roundNumber));
}
