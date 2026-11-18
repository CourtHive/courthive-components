import { TopologyEdge, TopologyNode, TopologyState } from '../types';
export interface QualifyingChain {
    /** The MAIN round the chain's head feeds. */
    roundTarget: number;
    /** The chain's cards, deepest first: [pre-qualifying, qualifying]. */
    nodes: TopologyNode[];
    /** The head's edge into MAIN. */
    edge: TopologyEdge;
}
export interface QualifyingPath {
    roundTarget: number;
    entryStageSequence: number;
    /** 1 for the card feeding MAIN, 2 for its pre-qualifying, … */
    depth: number;
    label: string;
}
/** Qualifying, Pre-qualifying, Pre-pre-qualifying, … by distance from MAIN. */
export declare function depthLabel(depth: number): string;
/**
 * Each chain of qualifying cards into MAIN. A card fed by more than one pre-qualifying card is read through its first;
 * the validator names the others.
 */
export declare function qualifyingChains(state: TopologyState): QualifyingChain[];
/** Each qualifying card's path, by node id. A card in no chain to MAIN has none. */
export declare function qualifyingPaths(state: TopologyState): Map<string, QualifyingPath>;
/** The warning a parallel chain's head carries, on its card and from the validator. */
export declare const PARALLEL_QUALIFYING_WARNING: (structureName: string) => string;
/**
 * Chains into the same MAIN round: their cards' paths coincide (two chains' deepest cards are both sequence 1 to that
 * round), so routing cannot tell their entries apart. CA, 2026-11-18: one card is a draw with sections; parallel cards
 * wait for a real need. Each such chain's head, after the first.
 */
export declare function parallelQualifying(state: TopologyState): TopologyNode[];
/** One band of the QUALIFYING acceptance list: the card its entrants play, and how many it takes directly. */
export interface QualifyingSlot {
    nodeId: string;
    structureName: string;
    path: QualifyingPath;
    /** The card's own entrants: its size less the qualifiers its pre-qualifying sends it. */
    entrants: number;
}
/**
 * The QUALIFYING acceptance list's bands, strongest first (CA, 2026-11-18): the stronger field earns the later entry
 * point, so a chain into a later MAIN round comes first, and within a chain the card nearest MAIN before its
 * pre-qualifying. Each band is as long as its card's own entrants, so resizing a card moves the cut line after it.
 */
export declare function qualifyingSlots(state: TopologyState): QualifyingSlot[];
/**
 * The accepted QUALIFYING entries, in acceptance order, cut into the slots' bands: the path each participant's entry
 * takes. Entries past the last band have no slot (the draws have no room for them).
 */
export declare function assignQualifyingSlots(participantIds: string[], slots: QualifyingSlot[]): {
    slot: QualifyingSlot;
    participantIds: string[];
}[];
/**
 * Whether the bands route their entries: more than one band, or one into a MAIN round after the first. A lone
 * qualifying structure into round 1 needs no path, and its entries are left as they are.
 */
export declare function routesQualifying(assignments: {
    roundTarget: number;
}[]): boolean;
