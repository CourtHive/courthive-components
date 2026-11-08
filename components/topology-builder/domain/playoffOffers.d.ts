import { PlayoffOffer } from '../types';
export interface AvailablePlayoffProfile {
    structureId?: string;
    playoffRoundsRanges?: {
        roundNumber: number;
        finishingPositionRange: string;
        finishingPositions?: number[];
    }[];
    playoffFinishingPositionRanges?: {
        finishingPosition: number;
        finishingPositionRange: string;
        finishingPositions?: number[];
    }[];
}
/** One structure's offers, lowest positions first, as the factory's ranges come. */
export declare function playoffOffersFromProfile(profile: AvailablePlayoffProfile | undefined): PlayoffOffer[];
/** The fields eligibility reads off a draw. */
export interface OfferDrawDefinition {
    drawType?: string;
    structures?: {
        structureId: string;
        stage?: string;
        stageSequence?: number;
        structureType?: string;
    }[];
}
/**
 * Whether a structure can take a voluntary consolation: the draw's first MAIN structure, an elimination structure (not
 * a round robin's container), in a draw that is not ad hoc and has no voluntary consolation yet. The structure menu's
 * own rule (TMX `getStructureOptions`), here so the menu and the topology chip ask one question.
 */
export declare function canAddVoluntaryConsolation(drawDefinition: OfferDrawDefinition | undefined, structureId: string): boolean;
/** The chip that adds a voluntary consolation. */
export declare const VOLUNTARY_CONSOLATION_OFFER: PlayoffOffer;
/**
 * Every structure's offers, keyed by structureId — the shape a host caches once per draw. Given the draw, the
 * structure that can take a voluntary consolation offers one too; the factory's playoff profiles leave voluntary
 * consolation out by design.
 */
export declare function playoffOffersByStructure(profiles: AvailablePlayoffProfile[] | undefined, drawDefinition?: OfferDrawDefinition): Map<string, PlayoffOffer[]>;
/**
 * The name a chip's structure is given: `<base> <range>` for a playoff, as the dialog's placeholders read; none for a
 * page playoff, so the factory names its three structures as the dialog leaves them unnamed (`3-4 Playoff`, `Playoff
 * Qualifier`, `Playoff Final`); `Consolation` for a voluntary consolation, as the structure menu names it.
 */
export declare function offerStructureName(offer: PlayoffOffer, base?: string): string | undefined;
/**
 * The part of `generateAndPopulatePlayoffStructures`' parameters an offer decides; the host adds drawId and structureId.
 *
 * A name and no abbreviation, as the Add playoffs dialog sends. The generator reads the abbreviation as optional
 * (`customNaming?.abbreviation ?? …`); the factory's `NamingEntry` type declares it required, so a typed call site
 * casts — the type is stricter than its reader, not the other way round.
 */
export type PlayoffGenerationParams = {
    roundProfiles: {
        [sourceRoundNumber: number]: number;
    }[];
    playoffAttributes: Record<string, {
        name: string;
    }>;
} | {
    playoffGroups: {
        finishingPositions: number[];
        structureName?: string;
        drawType?: string;
    }[];
};
/**
 * What the factory's playoff generator is asked for to attach ONE offer, named `structureName`.
 *
 * The same two shapes the Add playoffs dialogs send (TMX `addStructures` / `addRRplayoffs`): an elimination structure
 * plays off the losers of a round (`roundProfiles`, named through `playoffAttributes` keyed `0-<round>`), a round robin
 * a group finishing position (`playoffGroups`). Measured on 7.32.0 against a 32 round robin with a 1-16 playoff: both
 * attach, and the profiles read afterwards no longer offer the range.
 */
export declare function playoffGenerationParams(offer: PlayoffOffer, structureName: string | undefined): PlayoffGenerationParams | undefined;
