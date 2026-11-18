import { TopologyNode } from '../types';
/** Qualifier counts an elimination structure of `drawSize` entrants can produce, largest first: every count to half. */
export declare function eliminationQualifierCounts(drawSize: number): number[];
/** Qualifier counts for the node's structure type, largest first. */
export declare function qualifierCounts(node: Pick<TopologyNode, 'drawSize' | 'structureType'>): number[];
/**
 * A new qualifying structure's count: about a quarter of its entrants, from the counts that need fewest byes — halving
 * the entrants, or a power of two. A quarter of 30 is 7, a 56 draw with 26 byes; 4 plays from 32.
 */
export declare function defaultQualifiers(node: Pick<TopologyNode, 'drawSize' | 'structureType'>): number;
/** The node's qualifier count, as set or by default. */
export declare function qualifiersOf(node: Pick<TopologyNode, 'drawSize' | 'structureType' | 'qualifyingPositions'>): number;
/** The next count in `direction` (+1 more qualifiers, −1 fewer), or undefined at either end. */
export declare function steppedQualifierCount(node: Pick<TopologyNode, 'drawSize' | 'structureType' | 'qualifyingPositions'>, direction: 1 | -1): number | undefined;
/**
 * The elimination rounds the factory plays to leave `qualifiers` of `drawSize` entrants: the matchUps in each round,
 * and the positions of the first — the smallest `qualifiers × 2ⁿ` (n ≥ 1) that seats every entrant.
 * 40 for 10 → { positions: 40, rounds: [20, 10] }; 40 for 9 → { positions: 72, rounds: [36, 18, 9] }.
 */
export declare function eliminationQualifyingShape(drawSize: number, qualifiers: number): {
    positions: number;
    rounds: number[];
};
