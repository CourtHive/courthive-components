/**
 * Score entry for an OVERTIME format (`-O:{count}[X][SD]/{segment}`): regulation, extra periods while the
 * aggregate is level, then a decider (`-F:TB1`, or a shootout `-F:SO{n}` entered as its tally).
 *
 * ── The scoring engine decides, not this module ──
 *
 * How many periods a match plays depends on the score: an exact block (`O:2X`) is played to its end, an
 * ordinary period only while the total is level, a sudden-death period ends on its first goal, unlimited
 * overtime has no ceiling at all. The card used to cap the sets at `exactly` and open the next one
 * whenever the last was timed, so F2/F3/F5 could not enter overtime and F1/F4 opened it after a decided
 * regulation (overtime activation S6, CA 2026-11-04). Rather than keep a second copy of that rule, the
 * entered sets are replayed through the factory's public `ScoringEngine`, which owns it: it says whether
 * the match is decided, who won, what the next set is played to, and refuses a set that could not have
 * been played (with the reason, which the card shows).
 *
 * Which segment governs set k is grammar, not a decision: regulation for the first N, the overtime
 * segment within the ceiling, then `-F:`.
 */
type ParsedFormat = Record<string, any>;
/** A closed set as score entry holds it, in the factory's shape. */
type EnteredSet = {
    side1Score?: number;
    side2Score?: number;
    side1TiebreakScore?: number;
    side2TiebreakScore?: number;
};
export type OvertimeProgress = {
    /** the engine calls the match decided (a level finish under a finite ceiling with no decider is decided too) */
    complete: boolean;
    winningSide?: 1 | 2;
    /** the format of the next set, while the match is undecided */
    next?: Record<string, any>;
    /** why the engine refused a set, which is then the first set it did not take */
    refused?: string;
    refusedAt?: number;
};
/** Whether the format plays overtime (`-O:`). */
export declare function isOvertimeFormat(format: string | ParsedFormat | undefined): boolean;
/**
 * How many sets an overtime format can hold: regulation, the ceiling and the decider; `undefined` under
 * unlimited overtime, which has no ceiling.
 */
export declare function overtimeSetCeiling(format: string | ParsedFormat | undefined): number | undefined;
/** The segment set `setNumber` is played to: regulation, an overtime period, or the decider. */
export declare function overtimeSetFormat(format: string | ParsedFormat | undefined, setNumber: number): any;
/**
 * Where set `setNumber` falls: regulation, an overtime period (numbered from 1), or the decider; `undefined`
 * for a format without overtime.
 */
export declare function overtimePhaseOf(format: string | ParsedFormat | undefined, setNumber: number): {
    phase: 'REGULATION';
} | {
    phase: 'OVERTIME';
    period: number;
} | {
    phase: 'DECIDER';
    shootout: boolean;
} | undefined;
/** The set number of the decider (`-F:`), or `undefined` when there is none. */
export declare function overtimeDeciderSetNumber(format: string | ParsedFormat | undefined): number | undefined;
/**
 * The engine's reading of these CLOSED sets, in order. A set is offered with its principal score and, for a
 * one-point decider, its points; the engine reads whichever its segment takes.
 */
export declare function overtimeProgress(matchUpFormat: string, sets: EnteredSet[]): OvertimeProgress;
export {};
