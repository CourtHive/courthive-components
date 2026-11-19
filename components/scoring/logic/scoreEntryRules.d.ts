import { ClearGate, EndingIntent, ScoreEntryOutcome, ScoreEntryResolution, ScoreEntryView as DraftView, ScoreEntryRulesContext as DraftRulesContext } from 'tods-competition-factory/score-entry-state';
export { contradictsFinishedScore, scoreLocked, clearScoreForEnding, clearGate, clearHeadline } from 'tods-competition-factory/score-entry-state';
export type { ScoreEntryOutcome, ClearGateInput, ClearGate } from 'tods-competition-factory/score-entry-state';
/**
 * What the card's rules read: the model, and what the active region holds that the model cannot. The reported status
 * is held as a string, as Free Score's parser returns it (see `statusBoundary.ts`).
 */
export type ScoreEntryView = Omit<DraftView, 'reportedStatus'> & {
    reportedStatus?: string;
};
/** Whether the SCORE is a finished result. */
export declare function scoreIsFinished(view: ScoreEntryView): boolean;
/** Whether any score has been entered, in the model or as text the region holds. */
export declare function scoreEntered(view: ScoreEntryView): boolean;
/** Whether anything at all has been entered. */
export declare function holdsEntry(view: ScoreEntryView): boolean;
/** The resolution in force: the operator's selection, or failing that whatever the region parsed. */
export declare function resolutionInForce(view: ScoreEntryView): ScoreEntryResolution;
/** Whether an ending can be chosen at all, given the score. */
export declare function endingOffered(status: string, view: ScoreEntryView, disabledMatchUpStatuses?: readonly string[]): boolean;
/** The ending a score that has just finished contradicts, as the intent that un-chooses it. */
export declare function retractEndingContradictedByScore(view: ScoreEntryView): EndingIntent | undefined;
/** The host's scope and words, which every refusal message is built from. */
export type ScoreEntryRulesContext = DraftRulesContext & {
    /** The card's labels: status names and `SCORE_ENTRY_TEXT` keys, defaults already merged in. */
    labels?: Record<string, string>;
    /** The participants' names, for an integrity message that names them rather than "side 1". */
    sideNames?: [string, string];
};
/** The status-scope refusal first, then the model's integrity message, naming the participants. */
export declare function scoreEntryError(view: ScoreEntryView, context?: ScoreEntryRulesContext): string | undefined;
/** Why an ending control is disabled — out of scope, Retired with no score, or a finished score — in words. */
export declare function endingRefusalReason(status: string, view: ScoreEntryView, context?: ScoreEntryRulesContext): string;
/** The footer's state: whether Submit and Clear are live, and what Submit's title says. */
export declare function footerState(view: ScoreEntryView, gate: ClearGate, context?: ScoreEntryRulesContext): {
    submitDisabled: boolean;
    submitTitle: string;
    clearDisabled: boolean;
};
/** What Submit sends, or `undefined` when it must send nothing. The host's words play no part in it. */
export declare function submission(view: ScoreEntryView, gate: ClearGate, context?: ScoreEntryRulesContext): ScoreEntryOutcome | undefined;
