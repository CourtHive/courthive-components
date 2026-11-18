/**
 * A FEED_IN structure's explicit feed rounds (`structureOptions.feedRoundsProfile`), when they describe a draw of
 * `drawSize`: each the size of one of the base draw's rounds, adding up to what `drawSize` adds to its base. The
 * factory refuses any other profile (`isValidFeedRoundsProfile`), so the builder shows the default shape instead.
 */
export declare function feedRoundsProfileOf(drawSize: number, structureOptions?: any): number[] | undefined;
/**
 * An elimination structure's rounds, largest first: the base draw's rounds, each followed by the feed rounds of its
 * size. By default a feed round follows each base round whose size is a bit of what `drawSize` adds to its base (36:
 * one feed round of 4); a feed rounds profile names them instead (48 as [8, 8]: 16, 8, 8 fed, 8 fed, 4, 2, 1).
 */
export declare function eliminationRounds(drawSize: number, structureOptions?: any): {
    count: number;
    isFeed: boolean;
}[];
/**
 * For a given drawSize, return a Map from round number → feed capacity.
 * Feed rounds are the extra rounds inserted when drawSize > nearest power of 2.
 *
 * Example: drawSize=36, base=32, feedIn=4
 *   → { 4 → 4 }  (feed round 4 has capacity 4)
 * With a feed rounds profile: drawSize=48 as [8, 8] → { 3 → 8, 4 → 8 }
 */
export declare function getFeedRoundCapacities(drawSize: number, structureOptions?: any): Map<number, number>;
/**
 * Total number of rounds for a given drawSize, including feed rounds.
 * Equivalent to getNumRounds but works with drawSize directly.
 */
export declare function getTotalRounds(drawSize: number, structureOptions?: any): number;
/**
 * Compute round profiles for a lucky draw — mirrors the factory's luckyRoundProfiles().
 * Returns array of { participantsCount, preFeedRound, feedRound } per round.
 */
export declare function luckyRoundProfiles(drawSize: number): {
    participantsCount: number;
    preFeedRound: boolean;
    feedRound?: boolean;
}[];
/** Total rounds for a lucky draw structure. */
export declare function getLuckyDrawTotalRounds(drawSize: number): number;
/**
 * Number of losers that exit a lucky draw structure at a given round.
 * For pre-feed rounds, one lucky loser is retained → losers = matchUps - 1.
 * For non-pre-feed rounds, all losers exit → losers = matchUps.
 * In round 1, BYE positions don't produce real losers, so subtract BYEs.
 */
export declare function getLuckyDrawLosersForRound(drawSize: number, roundNumber: number): number;
/**
 * A lucky draw's explicit round profile (`structureOptions.roundProfile`, the factory's `roundProfile`), when it is one
 * the factory will generate; otherwise undefined and the default cascade applies. An invalid profile is never half-used:
 * the validator reports it, and every count here falls back to what the factory would play without it.
 */
export declare function customLuckyProfile(drawSize: number, structureOptions?: any): number[] | undefined;
/**
 * Structure-type-aware total rounds.
 * Dispatches to the correct algorithm based on structureType.
 */
export declare function getNodeTotalRounds(structureType: string, drawSize: number, structureOptions?: any): number;
/**
 * Structure-type-aware losers count for a given round.
 * For elimination/feed-in: drawSize / 2^round
 * For lucky draw: an explicit round profile's losers less the lucky losers the next round takes back, else the
 * default cascade (luckyRoundProfiles)
 */
export declare function getNodeLosersForRound(structureType: string, drawSize: number, roundNumber: number, structureOptions?: any): number;
