import { TopologyNode, TopologyState } from '../types';
/** One round MAIN's fed positions enter, and who takes them. */
export interface LateEntryRound {
    roundNumber: number;
    capacity: number;
    seeds: number;
    qualifiers: number;
}
export interface LateEntry {
    rounds: LateEntryRound[];
    /** Rounds whose qualifiers do not fit beside the seeds there. */
    short: LateEntryRound[];
    /** A MAIN that fits them: one more feed round after the short round, for the seeds. */
    proposal?: {
        drawSize: number;
        feedRoundsProfile: number[];
    };
}
/**
 * Whether MAIN's fed positions hold its seeds and the qualifiers routed after round 1, and, when they do not, the
 * MAIN that would: the short round's feed size stacked once more after it, for the seeds. Undefined when nothing is
 * routed after round 1. A qualifier routed to a round that is not fed is short with a capacity of 0, and has no
 * proposal: the validator already names that round.
 */
export declare function lateEntry(main: TopologyNode, state: TopologyState, seedsCount?: number): LateEntry | undefined;
/** The card's line for a short round: `R3 needs 16 places, has 8 · 8 seeds, 8 qualifiers`. */
export declare function lateEntryText(round: LateEntryRound): string;
