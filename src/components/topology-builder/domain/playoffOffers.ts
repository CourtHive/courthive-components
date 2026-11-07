/**
 * Playoff offers — the chips the `addPlayoffs` mode shows, from the factory's own answer.
 *
 * `getAvailablePlayoffProfiles` answers per structure, and called without a `structureId` answers for every structure
 * in the draw at once (`availablePlayoffProfiles`), with the positions already played off taken out. Measured on
 * factory 7.32.0, a 32-entry round robin (groups of 4) with a 1-16 playoff attached:
 *
 *   Main (round robin)  playoffFinishingPositionRanges  [3 → 17-24, 4 → 25-32]
 *   Playoff 1-16        playoffRoundsRanges             [R1 → 9-16, R2 → 5-8, R3 → 3-4]
 *
 * A structure answers in one of those two shapes, never both: an elimination structure by the round whose losers would
 * play the range off, a round robin by the group finishing position. Each becomes one offer.
 */
import type { PlayoffOffer } from '../types';

export interface AvailablePlayoffProfile {
  structureId?: string;
  playoffRoundsRanges?: { roundNumber: number; finishingPositionRange: string; finishingPositions?: number[] }[];
  playoffFinishingPositionRanges?: {
    finishingPosition: number;
    finishingPositionRange: string;
    finishingPositions?: number[];
  }[];
}

/** One structure's offers, lowest positions first, as the factory's ranges come. */
export function playoffOffersFromProfile(profile: AvailablePlayoffProfile | undefined): PlayoffOffer[] {
  if (!profile) return [];
  const byRound = (profile.playoffRoundsRanges ?? []).map(
    ({ roundNumber, finishingPositionRange, finishingPositions }) => ({
      key: `R${roundNumber}`,
      finishingPositionRange,
      finishingPositions,
      sourceRoundNumber: roundNumber
    })
  );
  const byPosition = (profile.playoffFinishingPositionRanges ?? []).map(
    ({ finishingPosition, finishingPositionRange, finishingPositions }) => ({
      key: `P${finishingPosition}`,
      finishingPositionRange,
      finishingPositions,
      groupFinishingPosition: finishingPosition
    })
  );
  return [...byRound, ...byPosition].sort((a, b) => lowestPosition(a) - lowestPosition(b));
}

/** Every structure's offers, keyed by structureId — the shape a host caches once per draw. */
export function playoffOffersByStructure(profiles: AvailablePlayoffProfile[] | undefined): Map<string, PlayoffOffer[]> {
  const offers = new Map<string, PlayoffOffer[]>();
  for (const profile of profiles ?? []) {
    if (profile.structureId) offers.set(profile.structureId, playoffOffersFromProfile(profile));
  }
  return offers;
}

function lowestPosition(offer: PlayoffOffer): number {
  const first = Number.parseInt(offer.finishingPositionRange, 10);
  return Number.isFinite(first) ? first : Number.POSITIVE_INFINITY;
}

/**
 * The part of `generateAndPopulatePlayoffStructures`' parameters an offer decides; the host adds drawId and structureId.
 *
 * A name and no abbreviation, as the Add playoffs dialog sends. The generator reads the abbreviation as optional
 * (`customNaming?.abbreviation ?? …`); the factory's `NamingEntry` type declares it required, so a typed call site
 * casts — the type is stricter than its reader, not the other way round.
 */
export type PlayoffGenerationParams =
  | { roundProfiles: { [sourceRoundNumber: number]: number }[]; playoffAttributes: Record<string, { name: string }> }
  | { playoffGroups: { finishingPositions: number[]; structureName: string }[] };

/**
 * What the factory's playoff generator is asked for to attach ONE offer, named `structureName`.
 *
 * The same two shapes the Add playoffs dialogs send (TMX `addStructures` / `addRRplayoffs`): an elimination structure
 * plays off the losers of a round (`roundProfiles`, named through `playoffAttributes` keyed `0-<round>`), a round robin
 * a group finishing position (`playoffGroups`). Measured on 7.32.0 against a 32 round robin with a 1-16 playoff: both
 * attach, and the profiles read afterwards no longer offer the range.
 */
export function playoffGenerationParams(offer: PlayoffOffer, structureName: string): PlayoffGenerationParams {
  if (offer.sourceRoundNumber !== undefined) {
    const round = offer.sourceRoundNumber;
    return { roundProfiles: [{ [round]: 1 }], playoffAttributes: { [`0-${round}`]: { name: structureName } } };
  }
  return { playoffGroups: [{ finishingPositions: [offer.groupFinishingPosition as number], structureName }] };
}
