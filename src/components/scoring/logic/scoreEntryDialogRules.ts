/**
 * The score-entry dialog's rules, as pure functions of what it was handed and what it holds.
 *
 * They lived inside `openScoreEntryDialog`'s closure, where the only way to reach them was to open a
 * modal: what the one model is seeded from, whether the dialog reopened on a finished RESULT (which
 * decides where focus goes), and what a format change reports having discarded. None of them is about
 * the DOM. The dialog still owns the modal, focus and the keyboard; these answer the questions those
 * act on.
 */
import { scoreGovernor } from 'tods-competition-factory';
import { isDoubleExitStatus } from './irregularEnding';
import { isComplete } from './scoreEntrySelectors';

import type { ScoreEntryModel } from './scoreEntryModel';
import type { SetScore } from '../types';

/** The part of a reopened matchUp these rules read. */
export type RecordedMatchUp = {
  matchUpFormat?: string;
  matchUpStatus?: string;
  winningSide?: number;
  score?: { sets?: SetScore[] };
};

/** What the dialog seeds its one model from. */
export type DialogSeed<M extends RecordedMatchUp = RecordedMatchUp> = {
  matchUpFormat?: string;
  sets?: SetScore[];
  matchUp?: M;
};

/**
 * The format and the sets the dialog opens on.
 *
 * Anything passed explicitly wins over what the reopened matchUp carries, so a host can override one
 * part without unpacking the rest: the format falls back to the matchUp's, and the sets to its score's.
 */
export function dialogSeed<M extends RecordedMatchUp>(params: DialogSeed<M>): DialogSeed<M> {
  return {
    matchUpFormat: params.matchUpFormat ?? params.matchUp?.matchUpFormat,
    sets: params.sets ?? params.matchUp?.score?.sets,
    matchUp: params.matchUp
  };
}

/**
 * Whether the dialog opened on a RECORDED result: a winner, a double exit, or a score that decides the
 * match by itself.
 *
 * A part-score with no winner — a suspension, a match still being entered — is not one, and keeps the
 * caret, because the operator is there to finish it. CA, 2026-10-01: *"a reopened completed matchUp
 * should not focus any entry cell at all."*
 */
export function reopensResult(matchUp: RecordedMatchUp | undefined, model: ScoreEntryModel): boolean {
  if (!matchUp) return false;
  return !!matchUp.winningSide || isDoubleExitStatus(matchUp.matchUpStatus) || isComplete(model);
}

/** What `onScoreDiscarded` is told: the sets kept, the sets lost, the validator's reason, the new format. */
export type ScoreDiscardedReport = {
  sets: SetScore[];
  discarded: SetScore[];
  reason?: string;
  matchUpFormat: string;
};

/**
 * What a format change costs the operator, in the factory's words — or `undefined` when it costs nothing,
 * so a host is told only when there is something to tell.
 *
 * `previousMatchUpFormat` is load-bearing for a complete but ILLEGAL set (a 3-7): under a change that does
 * not touch its rule it is KEPT, where validating it against the new format alone would discard it.
 */
export function formatChangeReport(
  sets: SetScore[],
  matchUpFormat: string,
  previousMatchUpFormat?: string
): ScoreDiscardedReport | undefined {
  const retained = scoreGovernor.retainScoreForFormat({ sets, matchUpFormat, previousMatchUpFormat });
  if (!retained.discarded.length) return undefined;
  return { ...retained, matchUpFormat };
}
