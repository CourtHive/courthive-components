import { ScoreEntryIssue, ScoreEntryModel } from 'tods-competition-factory/score-entry-state';
export { resolveEnding, enteredSets, completedSets, hasEntry, scoreString, discardedScore, isComplete, winningSide, matchUpStatus, scoreEntryIssue, unrecordedTiebreakSets, columns, isSettled, tiebreakOutstanding, cellValue } from 'tods-competition-factory/score-entry-state';
export type { ScoreSlot, ColumnOptions, ScoreEntryIssue } from 'tods-competition-factory/score-entry-state';
export type ErrorOptions = {
    /** Names for the two sides, so a message can say who rather than "side 1". */
    sideNames?: [string, string];
    /** The host's translations (see `SCORE_ENTRY_TEXT`). */
    labels?: Record<string, string | undefined>;
};
/** The first thing wrong with the score, in words, or `undefined`. See `scoreEntryIssue` for the order of checks. */
export declare function error(model: ScoreEntryModel, options?: ErrorOptions): string | undefined;
/** One issue as the sentence this dialog shows. */
export declare function issueText(issue: ScoreEntryIssue, options?: ErrorOptions): string;
/**
 * The band's note when a set decided by its tiebreak carries no points — `1st set: tiebreak points not recorded` —
 * or nothing. The engine records the set and warns (`TIEBREAK_POINTS_NOT_RECORDED`); the card says so before Submit.
 */
export declare function unrecordedTiebreakNote(model: ScoreEntryModel, options?: ErrorOptions): string | undefined;
