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
import { drawDefinitionConstants } from 'tods-competition-factory';

import type { PlayoffOffer } from '../types';

const { AD_HOC, CONTAINER, MAIN, PAGE_PLAYOFF, VOLUNTARY_CONSOLATION } = drawDefinitionConstants;

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
  return [...byRound, ...pagePlayoffOffer(byRound), ...byPosition].sort(
    (a, b) => lowestPosition(a) - lowestPosition(b)
  );
}

/**
 * A page playoff for positions 1-4, offered wherever the 3-4 range is (the Add playoffs dialog's own condition). It
 * decides 3rd and 4th itself, so it is the alternative to `3-4`, not an addition: measured on 7.32.0, once a page
 * playoff is attached the factory no longer offers 3-4, so both chips go without either knowing of the other. It draws
 * from the round whose losers would have played 3-4, the semifinal.
 */
function pagePlayoffOffer(byRound: PlayoffOffer[]): PlayoffOffer[] {
  const thirdFourth = byRound.find((offer) => offer.finishingPositionRange === '3-4');
  if (!thirdFourth) return [];
  return [
    {
      key: 'PAGE',
      kind: 'pagePlayoff',
      finishingPositionRange: '1-4',
      finishingPositions: [1, 2, 3, 4],
      sourceRoundNumber: thirdFourth.sourceRoundNumber
    }
  ];
}

/** The fields eligibility reads off a draw. */
export interface OfferDrawDefinition {
  drawType?: string;
  structures?: { structureId: string; stage?: string; stageSequence?: number; structureType?: string }[];
}

/**
 * Whether a structure can take a voluntary consolation: the draw's first MAIN structure, an elimination structure (not
 * a round robin's container), in a draw that is not ad hoc and has no voluntary consolation yet. The structure menu's
 * own rule (TMX `getStructureOptions`), here so the menu and the topology chip ask one question.
 */
export function canAddVoluntaryConsolation(
  drawDefinition: OfferDrawDefinition | undefined,
  structureId: string
): boolean {
  const structures = drawDefinition?.structures ?? [];
  const structure = structures.find((s) => s.structureId === structureId);
  if (!structure || structure.stage !== MAIN || (structure.stageSequence ?? 1) !== 1) return false;
  if (structure.structureType === CONTAINER || drawDefinition?.drawType === AD_HOC) return false;
  return !structures.some((s) => s.stage === VOLUNTARY_CONSOLATION);
}

/** The chip that adds a voluntary consolation. */
export const VOLUNTARY_CONSOLATION_OFFER: PlayoffOffer = {
  key: 'VC',
  kind: 'voluntaryConsolation',
  finishingPositionRange: ''
};

/**
 * Every structure's offers, keyed by structureId — the shape a host caches once per draw. Given the draw, the
 * structure that can take a voluntary consolation offers one too; the factory's playoff profiles leave voluntary
 * consolation out by design.
 */
export function playoffOffersByStructure(
  profiles: AvailablePlayoffProfile[] | undefined,
  drawDefinition?: OfferDrawDefinition
): Map<string, PlayoffOffer[]> {
  const offers = new Map<string, PlayoffOffer[]>();
  for (const profile of profiles ?? []) {
    if (profile.structureId) offers.set(profile.structureId, playoffOffersFromProfile(profile));
  }
  for (const structure of drawDefinition?.structures ?? []) {
    if (!canAddVoluntaryConsolation(drawDefinition, structure.structureId)) continue;
    offers.set(structure.structureId, [...(offers.get(structure.structureId) ?? []), VOLUNTARY_CONSOLATION_OFFER]);
  }
  return offers;
}

/**
 * The name a chip's structure is given: `<base> <range>` for a playoff, as the dialog's placeholders read; none for a
 * page playoff, so the factory names its three structures as the dialog leaves them unnamed (`3-4 Playoff`, `Playoff
 * Qualifier`, `Playoff Final`); `Consolation` for a voluntary consolation, as the structure menu names it.
 */
export function offerStructureName(offer: PlayoffOffer, base = 'Playoff'): string | undefined {
  if (offer.kind === 'pagePlayoff') return undefined;
  if (offer.kind === 'voluntaryConsolation') return 'Consolation';
  return `${base} ${offer.finishingPositionRange}`;
}

function lowestPosition(offer: PlayoffOffer): number {
  const first = Number.parseInt(offer.finishingPositionRange ?? '', 10);
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
  | { playoffGroups: { finishingPositions: number[]; structureName?: string; drawType?: string }[] };

/**
 * What the factory's playoff generator is asked for to attach ONE offer, named `structureName`.
 *
 * The same two shapes the Add playoffs dialogs send (TMX `addStructures` / `addRRplayoffs`): an elimination structure
 * plays off the losers of a round (`roundProfiles`, named through `playoffAttributes` keyed `0-<round>`), a round robin
 * a group finishing position (`playoffGroups`). Measured on 7.32.0 against a 32 round robin with a 1-16 playoff: both
 * attach, and the profiles read afterwards no longer offer the range.
 */
export function playoffGenerationParams(
  offer: PlayoffOffer,
  structureName: string | undefined
): PlayoffGenerationParams | undefined {
  // a voluntary consolation is not a playoff: `generateVoluntaryConsolation`, then `attachConsolationStructures`
  if (offer.kind === 'voluntaryConsolation') return undefined;
  if (offer.kind === 'pagePlayoff') {
    return {
      playoffGroups: [
        { drawType: PAGE_PLAYOFF, finishingPositions: [1, 2, 3, 4], ...(structureName && { structureName }) }
      ]
    };
  }
  if (offer.sourceRoundNumber !== undefined) {
    const round = offer.sourceRoundNumber;
    const name = structureName ?? `Playoff ${offer.finishingPositionRange}`;
    return { roundProfiles: [{ [round]: 1 }], playoffAttributes: { [`0-${round}`]: { name } } };
  }
  return {
    playoffGroups: [
      {
        finishingPositions: [offer.groupFinishingPosition as number],
        structureName: structureName ?? `Playoff ${offer.finishingPositionRange}`
      }
    ]
  };
}
