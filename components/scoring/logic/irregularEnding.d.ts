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
/**
 * The winner-selection value meaning "no side won this matchUp" — the explicit choice that produces
 * a double exit. A sentinel rather than `null` so the three states (unanswered / a side / neither)
 * stay distinguishable in a radio group's string values.
 */
export declare const NEITHER_SIDE = "NEITHER";
/** Shown when an irregular ending has been chosen but the winner question is unanswered. */
export declare const WINNER_REQUIRED_ERROR = "Select a winner";
/**
 * Every irregular ending a set-entry approach offers, in display order.
 *
 * ── Why ten, when this list held six ──
 *
 * It held six because those are exactly the keys the factory's scoring policy can refine with
 * `matchUpStatusCodes`, the reasoning being that a status with no code group cannot carry a reason.
 * That is true but it was the wrong list to derive a VOCABULARY from, and the cost was measurable:
 * `freeScoreApproach` has always parsed ten, so four statuses were typeable in one approach and
 * unreachable in the other three. Rotating between approaches could therefore show an ending that
 * could not be re-selected. The four additions (SUSPENDED, IN_PROGRESS, AWAITING_RESULT,
 * DEAD_RUBBER) simply carry no reason, which is the designed quiet state, not a defect.
 *
 * Two things checked while widening, recorded because neither is visible from here:
 *
 * - `WITHDRAWN` is NOT a factory matchUpStatus (`matchUpStatusConstants.WITHDRAWN` will not even
 *   compile), yet the USTA policy keys a seventh `matchUpStatusCodes` group with it, from
 *   `entryStatusConstants`. This comment previously called that "a code group no status can reach"
 *   and a factory problem. Both halves were wrong, and this is settled, twice over:
 *
 *   CA, 2026-09-27: "WITHDRAWN is a statusCode on a WALKOVER... WALKOVER (withdrawn injured or
 *   withdrawn ill)" — a withdrawal is expressed AS a walkover, and the WALKOVER group already ships
 *   that expression as `W5` / "Wo/Withdrawn". CA, 2026-09-19: the WALKOVER group records "a match
 *   that did not happen because someone withdrew", a RESULT; the WITHDRAWN group records "the
 *   withdrawal itself", an ENTRY action belonging to the entries UI. Same reasons, two events, two
 *   surfaces — which is why the groups are label-for-label parallel and must NOT be merged.
 *   `statusCodes.test.ts` holds that, including the measurement that refutes merging them.
 * - The ten partition PERFECTLY onto the factory's own classification: three directing, seven
 *   non-directing, with nothing in both and nothing in neither. The `endingPartition` test asserts
 *   this rather than trusting it.
 *
 * Ordered so the three that name a winner come first, then the three an operator reaches for most
 * often mid-tournament, then the remainder.
 */
export declare const SELECTABLE_ENDINGS: string[];
/**
 * The statuses whose selection opens the winner question at all.
 *
 * DERIVED from the factory's `directingMatchUpStatuses` rather than hand-listed, because "does a
 * winner advance out of this status" is the factory's question to answer and it already answers it.
 * Hand-adding a status to two sets is precisely where a mistake hides, and the eleventh ending
 * should classify itself rather than wait for someone to remember both places.
 */
export declare const WINNER_REQUIRING_STATUSES: Set<string>;
/**
 * Endings that resolve nobody: the match did not produce a result, so there is no winner to name
 * and no winner question to answer. Nothing advances out of them.
 *
 * These are NOT a smaller version of the winner-requiring endings. Asking "who won an abandoned
 * match" is not a question with a missing answer; it is not a question. So unlike a walkover with
 * no winner selection, one of these is valid the moment it is chosen.
 *
 * Also derived, and the complement of `WINNER_REQUIRING_STATUSES` over `SELECTABLE_ENDINGS` — but
 * computed independently from `nonDirectingMatchUpStatuses` rather than as `!winnerRequiring`, so
 * that a status the factory somehow classifies as NEITHER shows up as a test failure instead of
 * being silently swept in here.
 */
export declare const NON_DIRECTING_ENDINGS: Set<string>;
/** Whether choosing this ending obliges the operator to answer the winner question. */
export declare function requiresWinner(selectedOutcome: string | undefined): boolean;
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
 * ── CANCELLED and DEAD_RUBBER are here now, and that is a CLIENT policy ──
 *
 * They were held out on the stated grounds that they were "unreachable from the set-entry approaches
 * (only freeScore parses them)", with a note to revisit when the vocabulary widened. Two corrections
 * to that, found on widening it:
 *
 * 1. CANCELLED was never unreachable — it has been in `SELECTABLE_ENDINGS` all along and renders as
 *    a radio in both Dynamic Sets and Dial Pad. Only DEAD_RUBBER was genuinely out of reach.
 * 2. The rule was not absent, it was TRIPLICATED, and the three copies disagreed:
 *
 *        NO_SCORE_STATUSES          WALKOVER  DOUBLE_WALKOVER
 *        validateScore              WALKOVER  CANCELLED  DEAD_RUBBER
 *        freeScore display          WALKOVER  CANCELLED  DEAD_RUBBER
 *
 *    No copy held all four, and the two that agreed with each other both omitted DOUBLE_WALKOVER.
 *    This set is now the single one, and CA settled its contents (2026-09-27): selecting Cancelled
 *    or Dead Rubber clears any partial score present.
 *
 * Note what that means and does not mean. The FACTORY blanks scores for `{WALKOVER,
 * DOUBLE_WALKOVER}` only (`modifyMatchUpScore.ts:236`, verified) — `removeScore` is its separate
 * lever for anything else. So nothing server-side enforces the clearing of CANCELLED or DEAD_RUBBER;
 * the client simply never submits a score for them, which reaches the same place. Do not "correct"
 * this set toward the factory's: it is deliberately wider, and the widening is the policy.
 *
 * Still NOT here, and each for a reason worth keeping: `DEFAULTED` / `DOUBLE_DEFAULT`, because a
 * player can default part-way through a match that was genuinely played; `RETIRED`, which keeps
 * whatever was played; and ABANDONED / INCOMPLETE / SUSPENDED, where the partial score is the entire
 * content of the result — "6-4 3-2, suspended" says when it was suspended.
 */
export declare const NO_SCORE_STATUSES: Set<string>;
/**
 * Endings a typed score legitimately survives alongside.
 *
 * The Dial Pad clears the selected ending when a digit is typed — the operator is starting over —
 * and must not do that for an ending whose whole meaning includes a partial score. It decided this
 * by asking `NON_DIRECTING_ENDINGS`, which is a DIFFERENT question: "does anyone advance" is not
 * "is there a score". The two happened to coincide across the old six. They do not across the ten:
 * DEAD_RUBBER and CANCELLED are non-directing yet carry no score, so the old gate would have
 * preserved an ending that had just discarded the digits being typed.
 *
 * So it is stated as its own predicate over both axes, and the `endingPartition` test pins the case
 * that made the difference.
 */
export declare const SCORE_PRESERVING_ENDINGS: Set<string>;
/** Whether a typed score should be kept when this ending is selected. */
export declare function coexistsWithScore(selectedOutcome: string | undefined): boolean;
/**
 * Whether this ending means "no score exists", so score validation must be skipped rather than run
 * and then overridden.
 */
export declare function carriesNoScore(selectedOutcome: string | undefined): boolean;
/**
 * Unanswered (`undefined`), a side (`1` | `2`), or explicitly neither.
 */
export type WinnerSelection = 1 | 2 | typeof NEITHER_SIDE | undefined;
/** The double-exit statuses themselves, as opposed to the endings that produce them. */
export declare const DOUBLE_EXIT_STATUSES: Set<string>;
/**
 * Whether this status IS a double exit — no side advances.
 *
 * Distinct from `supportsNeitherSide`, which asks whether an *ending* can become one. Use this
 * where a status arrives already resolved, as it does from the inline popover.
 */
export declare function isDoubleExitStatus(matchUpStatus: string | undefined): boolean;
/**
 * The winner implied by a per-side exit control, where clicking a side's pill means THAT side is the
 * one exiting and the other therefore wins.
 *
 * Returns `undefined` for a double exit (nobody advances) and for the non-directing statuses —
 * SUSPENDED, CANCELLED, ABANDONED — which resolve nothing. The inline popover previously listed the
 * double exits among the statuses that "produce a winner", so had one ever been selectable it would
 * have stamped a winningSide on an outcome that must carry none.
 */
export declare function winnerFromExitingSide(matchUpStatus: string | undefined, exitingSideNumber?: number): number | undefined;
/**
 * Whether "Neither side" is a legitimate answer for this irregular ending.
 */
export declare function supportsNeitherSide(selectedOutcome: string | undefined): boolean;
/**
 * Message shown beside a double-exit selection. A double exit is not a scoring detail — it advances
 * nobody and propagates a walkover into the next round — so the modal says what it will do before it
 * is submitted rather than after.
 */
export declare function doubleExitWarning(selectedOutcome: string | undefined, labels?: Record<string, string | undefined>): string;
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
export declare function resolveIrregularEnding(params: {
    selectedOutcome: string | undefined;
    winnerSelection: WinnerSelection;
}): IrregularEndingResolution;
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
 * What the controls should show for a matchUp that already carries a result.
 *
 * The documented INVERSE of `resolveIrregularEnding`. That function was hoisted here because three
 * approaches each carried their own copy of the forward rule and disagreed; the inverse was left
 * behind in each of them and diverged the same way. Measured before this existed:
 *
 *   - `dynamicSetsApproach` restored all six endings and both double exits;
 *   - `dialPadApproach` restored only RETIRED / WALKOVER / DEFAULTED, so a saved ABANDONED,
 *     CANCELLED or INCOMPLETE re-opened reading as COMPLETED — and re-submitting silently replaced
 *     a non-directing status;
 *   - `freeScoreApproach` used a third mechanism entirely;
 *   - `inlineScoringApproach` discarded the saved result by construction.
 *
 * Round-tripping is the property that matters, and it is the one a test can hold: for every status
 * in `SELECTABLE_ENDINGS`, `resolveIrregularEnding(hydrateIrregularEnding(m))` must return the
 * status `m` was saved with.
 *
 * ── What each branch means ──
 *
 * A **double exit** is stored as its own status and carries no `winningSide`, so it inverts to the
 * base ending plus an explicit `NEITHER_SIDE` — the tri-state's third value, recovered rather than
 * guessed. A **non-directing** ending (ABANDONED, CANCELLED, INCOMPLETE) resolves nobody, so its
 * winner is `undefined` and must stay that way; reading a stray `winningSide` back onto one would
 * re-introduce the fail-open shape this module exists to prevent. Anything else — COMPLETED,
 * TO_BE_PLAYED, IN_PROGRESS, a status this vocabulary does not offer, or no matchUp at all —
 * inverts to COMPLETED with no winner, which is the inert state the controls open in.
 *
 * Deliberately NOT inferred: a `winningSide` present on a status that requires one is trusted, but a
 * MISSING one is returned as `undefined` rather than defaulted. An unanswered winner is the
 * fail-closed state (`WINNER_REQUIRED_ERROR`), and it must survive a save/reopen cycle as unanswered.
 */
export declare function hydrateIrregularEnding(matchUp?: {
    matchUpStatus?: string;
    winningSide?: number;
}): {
    selectedOutcome: string;
    winnerSelection: WinnerSelection;
};
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
