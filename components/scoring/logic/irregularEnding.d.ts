import { IrregularEndingResolution, WinnerSelection } from 'tods-competition-factory/score-entry-state';
export { NEITHER_SIDE, SELECTABLE_ENDINGS, WINNER_REQUIRING_STATUSES, NON_DIRECTING_ENDINGS, NO_SCORE_STATUSES, SCORE_PRESERVING_ENDINGS, DOUBLE_EXIT_STATUSES, requiresWinner, coexistsWithScore, carriesNoScore, supportsNeitherSide, resolveIrregularEnding } from 'tods-competition-factory/score-entry-state';
export type { IrregularEndingResolution, WinnerSelection } from 'tods-competition-factory/score-entry-state';
/** Whether this status IS a double exit: no side advances. */
export declare function isDoubleExitStatus(matchUpStatus: string | undefined): boolean;
/** The winner implied by a per-side exit control: the side that did not exit. */
export declare function winnerFromExitingSide(matchUpStatus: string | undefined, exitingSideNumber?: number): number | undefined;
/** What the controls should show for a matchUp that already carries a result (its status held as a string). */
export declare function hydrateIrregularEnding(matchUp?: {
    matchUpStatus?: string;
    winningSide?: number;
}): {
    selectedOutcome: string;
    winnerSelection: WinnerSelection;
};
/** Shown when an irregular ending has been chosen but the winner question is unanswered. */
export declare const WINNER_REQUIRED_ERROR = "Select a winner";
/**
 * Message shown beside a double-exit selection. A double exit is not a scoring detail — it advances
 * nobody and propagates a walkover into the next round — so the modal says what it will do before it
 * is submitted rather than after.
 */
export declare function doubleExitWarning(selectedOutcome: string | undefined, labels?: Record<string, string | undefined>): string;
/**
 * Apply a resolution onto a validation object in place, the shape the approaches already pass to
 * `onScoreChange`.
 *
 * It also clears any `error` the score validator left behind, and the two cases that reach here are
 * worth separating because only one of them is legitimate:
 *
 * - **RETIRED / DEFAULTED with a partial score.** The validator correctly reports "this is not a
 *   completed match"; the ending is what makes it a valid result anyway. Clearing the error is the
 *   right call — the validator answered a question that is no longer the one being asked.
 * - **A walkover.** There is no score to validate, so the validator should never have run. Callers
 *   must check `carriesNoScore()` and skip validation entirely; the clear here is a backstop, not
 *   the fix. A walkover that reported `isValid: true` beside
 *   `error: 'At least one set is required'` was the symptom of exactly that missing check.
 */
export declare function applyIrregularEndingToValidation(validation: any, selectedOutcome: string | undefined, winnerSelection: WinnerSelection): IrregularEndingResolution;
/**
 * Display labels for every selectable ending, with locale overrides applied.
 *
 * Shared because it was not: Dynamic Sets and Dial Pad each kept their own map covering only the
 * statuses they offered, and Dynamic Sets read it as `ENDING_LABELS[value]` with NO fallback — so
 * widening `SELECTABLE_ENDINGS` without this would have rendered four radios labelled `undefined`.
 * One map means an eleventh ending is either labelled or caught by `everySelectableEndingIsLabelled`.
 *
 * The fallback is the raw status rather than a blank, so an unlabelled ending is visibly wrong in the
 * UI rather than invisibly missing.
 */
export type EndingLabelOverrides = {
    retired?: string;
    walkover?: string;
    defaulted?: string;
    inProgress?: string;
    awaitingResult?: string;
    suspended?: string;
    abandoned?: string;
    cancelled?: string;
    incomplete?: string;
    deadRubber?: string;
};
export declare function endingLabels(labels?: EndingLabelOverrides): Record<string, string>;
