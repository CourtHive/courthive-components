import { SetScore } from '../types';
/** What the card reports on Submit, with the sets the dialog adds. */
export type ReportedOutcome = {
    matchUpStatus?: string;
    winningSide?: number;
    reasonCode?: string;
    score?: string;
    cleared?: boolean;
    sets?: SetScore[];
};
/** The outcome in the shape `tournamentEngine.setMatchUpStatus({ drawId, matchUpId, outcome })` reads. */
export type EngineOutcome = {
    matchUpStatus?: string;
    winningSide?: number;
    matchUpFormat?: string;
    matchUpStatusCodes?: string[];
    score: {
        sets: SetScore[];
    };
};
export declare function toEngineOutcome(outcome: ReportedOutcome, matchUpFormat?: string): EngineOutcome;
/**
 * The positional array the engine reads a reason from.
 *
 * A single exit: the side that did NOT win, at its index. A double exit: both. An ending that resolves
 * nobody: index 0, since there is no side — the engine files that one as `matchUpStatusCode`.
 */
export declare function positionalCodes({ reasonCode, matchUpStatus, winningSide }: ReportedOutcome): string[] | undefined;
