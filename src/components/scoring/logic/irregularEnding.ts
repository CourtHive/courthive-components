/**
 * Pure logic for resolving an irregular ending into a matchUpStatus.
 *
 * Every score-entry approach needs the same rule, and until now each one carried its own copy:
 * "walkover with a winner is a WALKOVER, walkover without one is a DOUBLE_WALKOVER". Three copies
 * of a rule is three chances to disagree about it, and they already disagreed about when Submit
 * should be live.
 *
 * The rule this module encodes differs from those copies in one deliberate way. A missing winner
 * used to mean "double exit" — so merely selecting Walkover produced a valid, submittable
 * DOUBLE_WALKOVER before the operator had chosen anything. That is a fail-open default (Mentat
 * architectural standard A3): the absence of an answer was read as a particular answer, and the
 * particular answer it was read as is one of the most consequential outcomes in the draw, because a
 * double exit advances nobody and propagates a walkover downstream.
 *
 * Here, absence is absence. `undefined` is "the operator has not answered yet" and is never valid;
 * a double exit requires explicitly choosing NEITHER_SIDE. No DOM dependencies, no side effects.
 */

import { matchUpStatusConstants } from 'tods-competition-factory';

const { COMPLETED, RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT, ABANDONED, CANCELLED, INCOMPLETE } =
  matchUpStatusConstants;

/**
 * The winner-selection value meaning "no side won this matchUp" — the explicit choice that produces
 * a double exit. A sentinel rather than `null` so the three states (unanswered / a side / neither)
 * stay distinguishable in a radio group's string values.
 */
export const NEITHER_SIDE = 'NEITHER';

/** Shown when an irregular ending has been chosen but the winner question is unanswered. */
export const WINNER_REQUIRED_ERROR = 'Select a winner';

/** The statuses whose selection opens the winner question at all. */
export const WINNER_REQUIRING_STATUSES = new Set<string>([RETIRED, WALKOVER, DEFAULTED]);

/**
 * Endings that resolve nobody: the match did not produce a result, so there is no winner to name
 * and no winner question to answer. The factory classifies these as non-directing
 * (`nonDirectingMatchUpStatuses`) — nothing advances out of them.
 *
 * These are NOT a smaller version of the winner-requiring endings. Asking "who won an abandoned
 * match" is not a question with a missing answer; it is not a question. So unlike a walkover with
 * no winner selection, one of these is valid the moment it is chosen.
 */
export const NON_DIRECTING_ENDINGS = new Set<string>([ABANDONED, CANCELLED, INCOMPLETE]);

/**
 * Every irregular ending a set-entry approach offers, in display order.
 *
 * These six are exactly the keys the factory's scoring policy can refine with `matchUpStatusCodes`
 * (ABANDONED, CANCELLED, DEFAULTED, INCOMPLETE, RETIRED, WALKOVER), which is why the list is this
 * list: a status with no code group cannot carry a reason, and a code group with no status cannot
 * be reached. Ordered so the three an operator reaches for most sit first.
 */
export const SELECTABLE_ENDINGS: string[] = [RETIRED, WALKOVER, DEFAULTED, ABANDONED, CANCELLED, INCOMPLETE];

/** Whether choosing this ending obliges the operator to answer the winner question. */
export function requiresWinner(selectedOutcome: string | undefined): boolean {
  return !!selectedOutcome && WINNER_REQUIRING_STATUSES.has(selectedOutcome);
}

/**
 * Statuses that carry NO score at all, so there is nothing to validate and nothing to submit.
 *
 * This mirrors the factory, which is the authority: `modifyMatchUpScore.ts:236` blanks the score
 * outright for exactly this set — `Object.assign(matchUp, { ...toBePlayed })`, commented "a walkover
 * has none". Note what is NOT here: `DEFAULTED` and `DOUBLE_DEFAULT` are absent in the factory too,
 * because a player can default part-way through a match that was genuinely played, and that partial
 * score is real. The same goes for `RETIRED` — a retirement keeps whatever was played, and needs no
 * completed set to be a valid result.
 *
 * `CANCELLED` and `DEAD_RUBBER` are deliberately NOT here even though this repo's `validateScore`
 * strips scores for them. They are unreachable from the set-entry approaches today (only freeScore
 * parses them) and the factory does not blank scores for them, so adding them here would be a
 * guess. Revisit when the status list widens — see Mentat SCORING_MODAL_STATUS_CODES.md M2.
 */
export const NO_SCORE_STATUSES = new Set<string>([WALKOVER, DOUBLE_WALKOVER]);

/**
 * Whether this ending means "no score exists", so score validation must be skipped rather than run
 * and then overridden.
 */
export function carriesNoScore(selectedOutcome: string | undefined): boolean {
  return !!selectedOutcome && NO_SCORE_STATUSES.has(selectedOutcome);
}

/**
 * Unanswered (`undefined`), a side (`1` | `2`), or explicitly neither.
 */
export type WinnerSelection = 1 | 2 | typeof NEITHER_SIDE | undefined;

/**
 * The double-exit status each irregular ending produces when neither side won.
 *
 * RETIRED is absent on purpose: the factory has no double-retirement status. Two participants who
 * both fail to finish are recorded as a double default or a double walkover depending on why, which
 * is a distinction the operator makes — not one this module can infer.
 */
const DOUBLE_EXIT_STATUS: Record<string, string> = {
  [WALKOVER]: DOUBLE_WALKOVER,
  [DEFAULTED]: DOUBLE_DEFAULT,
};

/** The double-exit statuses themselves, as opposed to the endings that produce them. */
export const DOUBLE_EXIT_STATUSES = new Set<string>([DOUBLE_WALKOVER, DOUBLE_DEFAULT]);

/**
 * Whether this status IS a double exit — no side advances.
 *
 * Distinct from `supportsNeitherSide`, which asks whether an *ending* can become one. Use this
 * where a status arrives already resolved, as it does from the inline popover.
 */
export function isDoubleExitStatus(matchUpStatus: string | undefined): boolean {
  return !!matchUpStatus && DOUBLE_EXIT_STATUSES.has(matchUpStatus);
}

/**
 * The winner implied by a per-side exit control, where clicking a side's pill means THAT side is the
 * one exiting and the other therefore wins.
 *
 * Returns `undefined` for a double exit (nobody advances) and for the non-directing statuses —
 * SUSPENDED, CANCELLED, ABANDONED — which resolve nothing. The inline popover previously listed the
 * double exits among the statuses that "produce a winner", so had one ever been selectable it would
 * have stamped a winningSide on an outcome that must carry none.
 */
export function winnerFromExitingSide(matchUpStatus: string | undefined, exitingSideNumber?: number): number | undefined {
  if (!matchUpStatus || !exitingSideNumber) return undefined;
  if (!WINNER_REQUIRING_STATUSES.has(matchUpStatus)) return undefined;
  return exitingSideNumber === 1 ? 2 : 1;
}

/**
 * Whether "Neither side" is a legitimate answer for this irregular ending.
 */
export function supportsNeitherSide(selectedOutcome: string | undefined): boolean {
  return !!selectedOutcome && selectedOutcome in DOUBLE_EXIT_STATUS;
}

/**
 * Message shown beside a double-exit selection. A double exit is not a scoring detail — it advances
 * nobody and propagates a walkover into the next round — so the modal says what it will do before it
 * is submitted rather than after.
 */
export function doubleExitWarning(selectedOutcome: string | undefined): string {
  const ending = selectedOutcome === WALKOVER ? 'Double walkover' : 'Double default';
  return `${ending} — neither side advances, and a walkover propagates to the next round.`;
}

export type IrregularEndingResolution = {
  /** The status to submit. `undefined` while the selection is incomplete. */
  matchUpStatus?: string;
  /** Present only when a side was named. A double exit deliberately carries none. */
  winningSide?: number;
  /** Whether this resolution may be submitted. */
  isValid: boolean;
  /** True when the operator still owes a winner answer — the fail-closed state. */
  awaitingWinner: boolean;
  /** True when the resolution is a double exit, so callers can warn before it is submitted. */
  isDoubleExit: boolean;
};

/**
 * Resolve an irregular ending plus a winner selection into the status to submit.
 *
 * `COMPLETED` is not an irregular ending — callers keep their own completion handling and this
 * returns an inert resolution for it.
 */
export function resolveIrregularEnding(params: {
  selectedOutcome: string | undefined;
  winnerSelection: WinnerSelection;
}): IrregularEndingResolution {
  const { selectedOutcome, winnerSelection } = params;

  if (!selectedOutcome || selectedOutcome === COMPLETED) {
    return { isValid: false, awaitingWinner: false, isDoubleExit: false };
  }

  // An ending that resolves nobody needs no winner and is complete as soon as it is chosen. This
  // must come before the winner branches: falling through to them would treat "no winner named" as
  // an unanswered question and refuse to submit an abandoned match forever.
  if (!requiresWinner(selectedOutcome)) {
    return { matchUpStatus: selectedOutcome, isValid: true, awaitingWinner: false, isDoubleExit: false };
  }

  if (winnerSelection === 1 || winnerSelection === 2) {
    return {
      matchUpStatus: selectedOutcome,
      winningSide: winnerSelection,
      isValid: true,
      awaitingWinner: false,
      isDoubleExit: false,
    };
  }

  if (winnerSelection === NEITHER_SIDE) {
    const doubleExitStatus = DOUBLE_EXIT_STATUS[selectedOutcome];

    // "Neither" on an ending with no double form (RETIRED) is not a resolution — it is an answer
    // the UI should not have offered. Fail closed rather than inventing a status.
    if (!doubleExitStatus) {
      return { matchUpStatus: selectedOutcome, isValid: false, awaitingWinner: true, isDoubleExit: false };
    }

    return {
      matchUpStatus: doubleExitStatus,
      isValid: true,
      awaitingWinner: false,
      isDoubleExit: true,
    };
  }

  // Unanswered. Carry the selected status so the preview can render it, but refuse to submit.
  return { matchUpStatus: selectedOutcome, isValid: false, awaitingWinner: true, isDoubleExit: false };
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
  winnerSelection: WinnerSelection,
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
