/**
 * Irregular endings: the resolution rule is owned by the factory (`tods-competition-factory/score-entry-state`), with
 * the draft that uses it, and re-exported here. What stays is presentation: the ending labels, the double-exit
 * warning, and the legacy validation adapter with its English winner prompt.
 *
 * The rule itself: absence is absence. `undefined` is "not answered yet" and never valid, and a double exit requires
 * explicitly choosing `NEITHER_SIDE` — reading a missing winner as a double exit was a fail-open default (Mentat
 * architectural standard A3).
 */

import { matchUpStatusConstants } from 'tods-competition-factory';
import { asStatus, withStatus } from './statusBoundary';
import { scoreEntryText } from './scoreEntryText';
import {
  hydrateIrregularEnding as hydrateDraftIrregularEnding,
  winnerFromExitingSide as draftWinnerFromExitingSide,
  isDoubleExitStatus as draftIsDoubleExitStatus,
  resolveIrregularEnding,
  SELECTABLE_ENDINGS
} from 'tods-competition-factory/score-entry-state';

import type { IrregularEndingResolution, WinnerSelection } from 'tods-competition-factory/score-entry-state';

export {
  NEITHER_SIDE,
  SELECTABLE_ENDINGS,
  WINNER_REQUIRING_STATUSES,
  NON_DIRECTING_ENDINGS,
  NO_SCORE_STATUSES,
  SCORE_PRESERVING_ENDINGS,
  DOUBLE_EXIT_STATUSES,
  requiresWinner,
  coexistsWithScore,
  carriesNoScore,
  supportsNeitherSide,
  resolveIrregularEnding
} from 'tods-competition-factory/score-entry-state';
export type { IrregularEndingResolution, WinnerSelection } from 'tods-competition-factory/score-entry-state';

const {
  COMPLETED,
  RETIRED,
  WALKOVER,
  DEFAULTED,
  ABANDONED,
  CANCELLED,
  INCOMPLETE,
  SUSPENDED,
  DEAD_RUBBER,
  IN_PROGRESS,
  AWAITING_RESULT
} = matchUpStatusConstants;

/** Whether this status IS a double exit: no side advances. */
export function isDoubleExitStatus(matchUpStatus: string | undefined): boolean {
  return draftIsDoubleExitStatus(asStatus(matchUpStatus));
}

/** The winner implied by a per-side exit control: the side that did not exit. */
export function winnerFromExitingSide(
  matchUpStatus: string | undefined,
  exitingSideNumber?: number
): number | undefined {
  return draftWinnerFromExitingSide(asStatus(matchUpStatus), exitingSideNumber);
}

/** What the controls should show for a matchUp that already carries a result (its status held as a string). */
export function hydrateIrregularEnding(matchUp?: { matchUpStatus?: string; winningSide?: number }): {
  selectedOutcome: string;
  winnerSelection: WinnerSelection;
} {
  return hydrateDraftIrregularEnding(withStatus(matchUp));
}

/** Shown when an irregular ending has been chosen but the winner question is unanswered. */
export const WINNER_REQUIRED_ERROR = 'Select a winner';

/**
 * Message shown beside a double-exit selection. A double exit is not a scoring detail — it advances
 * nobody and propagates a walkover into the next round — so the modal says what it will do before it
 * is submitted rather than after.
 */
export function doubleExitWarning(
  selectedOutcome: string | undefined,
  labels?: Record<string, string | undefined>
): string {
  const ending = scoreEntryText(labels, selectedOutcome === WALKOVER ? 'doubleWalkover' : 'doubleDefault');
  return scoreEntryText(labels, 'doubleExitWarning', { ending });
}

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
export function applyIrregularEndingToValidation(
  validation: any,
  selectedOutcome: string | undefined,
  winnerSelection: WinnerSelection
): IrregularEndingResolution {
  const resolution = resolveIrregularEnding({ selectedOutcome, winnerSelection });

  if (!selectedOutcome || selectedOutcome === COMPLETED) return resolution;

  validation.matchUpStatus = resolution.matchUpStatus;
  validation.isValid = resolution.isValid;

  if (resolution.winningSide === undefined) {
    delete validation.winningSide;
  } else {
    validation.winningSide = resolution.winningSide;
  }

  if (resolution.isValid) {
    delete validation.error;
  } else if (resolution.awaitingWinner) {
    validation.error = WINNER_REQUIRED_ERROR;
  }

  return resolution;
}

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

export function endingLabels(labels: EndingLabelOverrides = {}): Record<string, string> {
  const defaults: Record<string, string> = {
    [RETIRED]: 'Retired',
    [WALKOVER]: 'Walkover',
    [DEFAULTED]: 'Defaulted',
    [IN_PROGRESS]: 'In Progress',
    [AWAITING_RESULT]: 'Awaiting Result',
    [SUSPENDED]: 'Suspended',
    [ABANDONED]: 'Abandoned',
    [CANCELLED]: 'Cancelled',
    [INCOMPLETE]: 'Incomplete',
    [DEAD_RUBBER]: 'Dead Rubber'
  };
  const overrides: Record<string, string | undefined> = {
    [RETIRED]: labels.retired,
    [WALKOVER]: labels.walkover,
    [DEFAULTED]: labels.defaulted,
    [IN_PROGRESS]: labels.inProgress,
    [AWAITING_RESULT]: labels.awaitingResult,
    [SUSPENDED]: labels.suspended,
    [ABANDONED]: labels.abandoned,
    [CANCELLED]: labels.cancelled,
    [INCOMPLETE]: labels.incomplete,
    [DEAD_RUBBER]: labels.deadRubber
  };

  return Object.fromEntries(
    SELECTABLE_ENDINGS.map((status) => [status, overrides[status] || defaults[status] || status])
  );
}
