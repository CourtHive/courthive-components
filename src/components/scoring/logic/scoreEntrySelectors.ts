/**
 * Pure answers computed FROM a `ScoreEntryModel` — owned by the factory (`tods-competition-factory/score-entry-state`)
 * and re-exported here, with the two that speak to the operator worded for this dialog.
 *
 * The factory reports what is wrong as data (`scoreEntryIssue`: a code, the set it is in, and its data) and which
 * sets carry no tiebreak points (`unrecordedTiebreakSets`). `error` and `unrecordedTiebreakNote` turn those into the
 * sentences this dialog has always shown — in the host's translations, naming the participant rather than "side 1".
 * Messages the factory itself returns (a set `validateSetScore` refuses, an overtime set the scoring rules refuse)
 * arrive in the factory's words, as they always did.
 */
import { scoreEntryIssue, unrecordedTiebreakSets } from 'tods-competition-factory/score-entry-state';
import { ordinalSetLabel } from '../regions/setColumns';
import { scoreEntryText } from './scoreEntryText';

import type { ScoreEntryIssue, ScoreEntryModel } from 'tods-competition-factory/score-entry-state';

export {
  resolveEnding,
  enteredSets,
  completedSets,
  hasEntry,
  scoreString,
  discardedScore,
  isComplete,
  winningSide,
  matchUpStatus,
  scoreEntryIssue,
  unrecordedTiebreakSets,
  columns,
  isSettled,
  tiebreakOutstanding,
  cellValue
} from 'tods-competition-factory/score-entry-state';
export type { ScoreSlot, ColumnOptions, ScoreEntryIssue } from 'tods-competition-factory/score-entry-state';

export type ErrorOptions = {
  /** Names for the two sides, so a message can say who rather than "side 1". */
  sideNames?: [string, string];
  /** The host's translations (see `SCORE_ENTRY_TEXT`). */
  labels?: Record<string, string | undefined>;
};

/** The first thing wrong with the score, in words, or `undefined`. See `scoreEntryIssue` for the order of checks. */
export function error(model: ScoreEntryModel, options: ErrorOptions = {}): string | undefined {
  const issue = scoreEntryIssue(model);
  return issue ? issueText(issue, options) : undefined;
}

/** One issue as the sentence this dialog shows. */
export function issueText(issue: ScoreEntryIssue, options: ErrorOptions = {}): string {
  const set = setLabel(issue.setIndex, options);
  switch (issue.code) {
    case 'TIEBREAK_CONTRADICTION': {
      const side = issue.gamesWinner;
      const name = options.sideNames?.[side - 1] ?? scoreEntryText(options.labels, 'sideFallback', { side });
      return scoreEntryText(options.labels, 'tiebreakContradiction', { set, name });
    }
    case 'SET_HAS_NO_SCORE':
      return scoreEntryText(options.labels, 'setHasNoScore', { set });
    case 'SET_NOT_FINISHED':
      return scoreEntryText(options.labels, 'setNotFinished', { set });
    default:
      // INVALID_SET and OVERTIME_REFUSED carry the factory's own words
      return `${set} ${issue.message}`;
  }
}

/**
 * The band's note when a set decided by its tiebreak carries no points — `1st set: tiebreak points not recorded` —
 * or nothing. The engine records the set and warns (`TIEBREAK_POINTS_NOT_RECORDED`); the card says so before Submit.
 */
export function unrecordedTiebreakNote(model: ScoreEntryModel, options: ErrorOptions = {}): string | undefined {
  const notes = unrecordedTiebreakSets(model).map((index) =>
    scoreEntryText(options.labels, 'tiebreakPointsNotRecorded', { set: setLabel(index, options) })
  );
  return notes.length ? notes.join(' · ') : undefined;
}

/** `1st set:`, `2nd set:`: the prefix every message here carries, so the operator knows which column. */
function setLabel(index: number, options: ErrorOptions): string {
  return scoreEntryText(options.labels, 'setPrefix', { ordinal: ordinalSetLabel(index + 1), number: index + 1 });
}
