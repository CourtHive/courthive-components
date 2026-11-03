import { PressureUnsupportedReason } from './types';
export declare const BYE_STATUS = "BYE";
export type GraphSide = {
    participantId?: string;
    participant?: any;
    drawPosition?: number;
    bye: boolean;
};
export type GraphMatchUp = {
    matchUpId?: string;
    roundNumber: number;
    roundPosition: number;
    sides: [GraphSide, GraphSide];
    winningSide?: number;
    matchUpStatus?: string;
    raw: any;
};
export type EliminationGraph = {
    roundNumbers: number[];
    /** roundNumber -> roundPosition -> matchUp */
    byRound: Map<number, Map<number, GraphMatchUp>>;
    firstRound: number;
};
/**
 * Build the graph, or say why it could not be built.
 *
 * Rejects anything that is not a clean halving tree — round-robin containers,
 * ad-hoc structures, and fed/consolation shapes whose round sizes do not halve.
 * Refusing is deliberate: a wrong tree would produce a plausible-looking
 * projection with silently wrong opponents, which is worse than no chart.
 */
export declare function buildEliminationGraph(matchUps: any[]): {
    graph?: EliminationGraph;
    unsupported?: PressureUnsupportedReason;
};
/** The two feeder positions of `(roundNumber, roundPosition)` in the previous round. */
export declare function feederPositions(roundPosition: number): [number, number];
/** The position a winner of `roundPosition` advances into, in the next round. */
export declare function advancingPosition(roundPosition: number): number;
/** True when the matchUp is a bye for whichever side is present. */
export declare function isByeMatchUp(matchUp: GraphMatchUp): boolean;
