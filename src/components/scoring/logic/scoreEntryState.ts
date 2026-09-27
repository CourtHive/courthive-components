/**
 * The state of the redesigned score-entry card, and what it resolves to.
 *
 * ── What the redesign changes, and what it deliberately does not ──
 *
 * The old dialog asked two questions in sequence: pick an irregular ending, then answer a separate
 * winner question with a tri-state radio group (side 1 / side 2 / neither). The design's central move
 * is that **the second question disappears rather than being redesigned**: an ending is chosen ON a
 * player's row, which names the side that ended early, and the winner is therefore already known.
 *
 * So the ten selectable endings split by what they resolve, which is exactly the factory's own
 * classification (`SELECTABLE_ENDINGS` partitions 3 / 7 — see `irregularEnding.ts`):
 *
 * - THREE belong to a SIDE — Retired, Walkover, Defaulted — and live on the player rows.
 * - SEVEN belong to the MATCH — In Progress, Awaiting Result, Suspended, Abandoned, Cancelled,
 *   Incomplete, Dead Rubber — and live in one wrapping row beneath, three privileged as buttons and
 *   the rest behind "Other…".
 *
 * That is a new SHAPE OF QUESTION, not a new rule. This module therefore resolves nothing itself. It
 * maps the card's controls onto `resolveIrregularEnding`, which already encodes every outcome:
 *
 *     side ending, one side out        → { selectedOutcome: status, winnerSelection: <other side> }
 *     side ending + "neither appeared" → { selectedOutcome: status, winnerSelection: NEITHER_SIDE }
 *     match-level ending               → { selectedOutcome: status, winnerSelection: undefined }
 *
 * Writing it any other way would hand the redesign its own copy of the forward walkover rule. Three
 * approaches already carried three disagreeing copies of that rule, which is why `irregularEnding.ts`
 * exists at all; a fourth copy in a nicer-looking card is still a fourth copy.
 *
 * No DOM, no side effects, and every transition returns a new object.
 */

import {
  WINNER_REQUIRING_STATUSES,
  resolveIrregularEnding,
  NON_DIRECTING_ENDINGS,
  SELECTABLE_ENDINGS,
  supportsNeitherSide,
  carriesNoScore,
  NEITHER_SIDE,
} from './irregularEnding';

import type { IrregularEndingResolution } from './irregularEnding';

/** Which side a per-side ending was recorded against. */
export type SideNumber = 1 | 2;

/**
 * Everything the card holds that is not the score itself.
 *
 * The score lives in the score region (per-set inputs, a text field, or a keypad) and is passed in
 * when resolving, because all three regions already own it and the card must not become a second
 * place it can be edited.
 */
export type ScoreEntryState = {
  /**
   * The side that ended early, and how. `sideNumber` is the side the ending HAPPENED TO — the one
   * that retired or failed to appear — not the winner. The winner is derived from it.
   */
  sideEnding?: { sideNumber: SideNumber; status: string };

  /**
   * "…did not appear either — no one advances." The checkbox on the affected row that turns a side
   * ending into a double exit.
   *
   * A separate flag rather than a third value on `sideEnding`, because it is a different assertion:
   * the operator has said something about the OTHER side. Collapsing them is how the old tri-state
   * came to treat "unanswered" and "neither" as the same thing.
   */
  bothSidesOut?: boolean;

  /** The match-level ending. One of the seven; mutually exclusive with `sideEnding`. */
  matchEnding?: string;

  /** The policy reason code chosen for whichever ending is selected. */
  reasonCode?: string;
};

/** What the card resolves to, plus the two things the UI needs that a resolution alone does not say. */
export type ScoreEntryResolution = IrregularEndingResolution & {
  /** True when the selected ending means a typed score must be discarded rather than submitted. */
  clearsScore: boolean;
  /** True when an ending is selected at all, so the score region can render itself inert. */
  hasEnding: boolean;
};

/** The empty card: no ending chosen, which is a reachable state and not a null one. */
export const emptyScoreEntryState: ScoreEntryState = {};

/**
 * Record (or un-record) a per-side ending.
 *
 * Every control in the card is a TOGGLE, so choosing the ending already selected on that same side
 * clears it. This is what gives the card a reachable empty state; a radio group has none, which is
 * GOV.UK's standing objection to pre-selected radios — a user cannot get back to "nothing chosen"
 * without reloading the page.
 *
 * Choosing a side ending clears any match-level ending, and vice versa. They answer the same
 * question — how did this match end — so allowing both would let the card hold two answers and
 * submit whichever the resolver happened to read first.
 *
 * `bothSidesOut` and `reasonCode` are dropped on any change of ending, because both are qualifiers
 * OF an ending: a reason code chosen for a retirement is not a reason for a walkover, and the codes
 * come from different policy groups. Carrying either across would submit a qualifier the operator
 * never chose for the ending it ends up attached to.
 */
export function chooseSideEnding(
  state: ScoreEntryState,
  sideNumber: SideNumber,
  status: string,
): ScoreEntryState {
  const current = state.sideEnding;
  if (current?.sideNumber === sideNumber && current.status === status) {
    return { ...state, sideEnding: undefined, bothSidesOut: undefined, reasonCode: undefined };
  }

  return { ...state, sideEnding: { sideNumber, status }, matchEnding: undefined, bothSidesOut: undefined, reasonCode: undefined };
}

/**
 * Record (or un-record) a match-level ending. A toggle, on the same reasoning as above.
 */
export function chooseMatchEnding(state: ScoreEntryState, status: string): ScoreEntryState {
  if (state.matchEnding === status) {
    return { ...state, matchEnding: undefined, reasonCode: undefined };
  }

  return { ...state, matchEnding: status, sideEnding: undefined, bothSidesOut: undefined, reasonCode: undefined };
}

/**
 * Toggle "the other side did not appear either".
 *
 * Refused when there is no side ending to qualify, and refused when the ending has no double form:
 * RETIRED is the case — the factory has no double-retirement status, and two players who both fail
 * to finish are a double default or a double walkover depending on why, which is the operator's
 * distinction to make and not one this module can infer. Returning the state unchanged rather than
 * setting a flag that cannot resolve keeps the card from offering a checkbox whose answer is dropped.
 */
export function toggleBothSidesOut(state: ScoreEntryState): ScoreEntryState {
  if (!state.sideEnding || !supportsNeitherSide(state.sideEnding.status)) return state;
  return { ...state, bothSidesOut: !state.bothSidesOut };
}

/** Whether the card should offer the "did not appear either" checkbox at all. */
export function offersBothSidesOut(state: ScoreEntryState): boolean {
  return !!state.sideEnding && supportsNeitherSide(state.sideEnding.status);
}

/** Choose (or clear) a reason code for the selected ending. A toggle, like everything else. */
export function chooseReasonCode(state: ScoreEntryState, code: string | undefined): ScoreEntryState {
  return { ...state, reasonCode: state.reasonCode === code ? undefined : code };
}

/**
 * The status whose policy code group the reason chips should come from.
 *
 * `undefined` when no ending is selected, because there is nothing to give a reason for.
 */
export function reasonCodeStatus(state: ScoreEntryState): string | undefined {
  return state.sideEnding?.status ?? state.matchEnding;
}

/**
 * Resolve the card into a submittable outcome.
 *
 * ── The one piece of derivation that lives here ──
 *
 * A per-side ending is recorded against the side it HAPPENED TO, and the winner is the other side.
 * That inversion is the whole reason the separate winner question can be deleted, so it is stated
 * once, here, and asserted on its own:
 *
 *     sideEnding.sideNumber === 1  →  winnerSelection 2
 *
 * Everything past that point is `resolveIrregularEnding`'s answer, unmodified — including the
 * fail-closed states. Note in particular that a side ending with `bothSidesOut` on an ending with no
 * double form cannot occur, because `toggleBothSidesOut` refuses to set it; if it somehow does, the
 * resolver's own guard returns `isValid: false` rather than inventing a status.
 */
export function resolveScoreEntry(state: ScoreEntryState): ScoreEntryResolution {
  const selectedOutcome = reasonCodeStatus(state);

  if (!selectedOutcome) {
    return {
      isValid: false,
      awaitingWinner: false,
      isDoubleExit: false,
      clearsScore: false,
      hasEnding: false,
    };
  }

  const winnerSelection = state.sideEnding
    ? state.bothSidesOut
      ? NEITHER_SIDE
      : otherSide(state.sideEnding.sideNumber)
    : undefined;

  const resolution = resolveIrregularEnding({ selectedOutcome, winnerSelection });

  return {
    ...resolution,
    // Read from the RESOLVED status, not the selected ending, because `NO_SCORE_STATUSES` is written
    // against resolved statuses — it holds DOUBLE_WALKOVER, which is never something an operator
    // clicks. Note honestly that this is a robustness choice and not a behaviour difference today:
    // the set holds both members of each pair, so the selected ending gives the same answer for every
    // status in the present vocabulary. Planting that version fails no test. It stops being
    // equivalent the first time a double form and its base disagree about scores.
    clearsScore: carriesNoScore(resolution.matchUpStatus),
    hasEnding: true,
  };
}

/** The side that wins when `sideNumber` is the one that ended early. */
function otherSide(sideNumber: SideNumber): SideNumber {
  return sideNumber === 1 ? 2 : 1;
}

/**
 * Which endings the card offers on a player row, and which in the match-level group.
 *
 * Derived from the same two sets the approaches use, in `SELECTABLE_ENDINGS` order, so the card
 * cannot offer an ending the vocabulary does not hold or drop one it does. The split is not a layout
 * choice: it is `WINNER_REQUIRING_STATUSES` and `NON_DIRECTING_ENDINGS`, which come from the
 * factory's `directingMatchUpStatuses` / `nonDirectingMatchUpStatuses`.
 */
export function sideEndingOptions(): string[] {
  return orderedEndings(WINNER_REQUIRING_STATUSES);
}

export function matchEndingOptions(): string[] {
  return orderedEndings(NON_DIRECTING_ENDINGS);
}

function orderedEndings(set: Set<string>): string[] {
  // SELECTABLE_ENDINGS is the display order; filtering it preserves that rather than depending on
  // Set iteration order, which is insertion order and therefore an accident of how the set was built.
  return SELECTABLE_ENDINGS.filter((status) => set.has(status));
}
