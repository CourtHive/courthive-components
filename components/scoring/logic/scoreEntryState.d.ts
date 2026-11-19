import { ScoreEntryResolution, ScoreEntryState } from 'tods-competition-factory/score-entry-state';
import { RecordedMatchUpReason } from './scoreEntryModel';
export { emptyScoreEntryState, chooseSideEnding, chooseMatchEnding, toggleBothSidesOut, offersBothSidesOut, chooseReasonCode, reasonCodeStatus, resolveScoreEntry, sideEndingOptions, matchEndingOptions } from 'tods-competition-factory/score-entry-state';
export type { ScoreEntryState, ScoreEntryResolution, SideNumber } from 'tods-competition-factory/score-entry-state';
/** The ending of a matchUp that already has an outcome (its status held as a string). */
export declare function hydrateScoreEntryState(matchUp?: RecordedMatchUpReason): ScoreEntryState;
/** A resolution for an ending a score region reported rather than the operator selected. */
export declare function resolveReportedEnding(matchUpStatus?: string, winningSide?: number): ScoreEntryResolution;
