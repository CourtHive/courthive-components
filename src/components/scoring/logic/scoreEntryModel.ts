/**
 * The score-entry MODEL — now owned by the factory.
 *
 * The immutable score state and its transitions moved to `tods-competition-factory/score-entry-state` (CA,
 * 2026-11-19), so a host with no DOM — a worker, a server, a mobile shell that holds no tournament engine — keeps
 * the same score state with the same rules this dialog uses. This module re-exports them under the names the regions,
 * the card and the tests have always imported. Nothing about the score is decided here any more.
 */
import { createScoreEntryModel as createFactoryModel } from 'tods-competition-factory/score-entry-state';
import { withStatus } from './statusBoundary';

import type {
  CreateScoreEntryModelParams as FactoryParams,
  RecordedReason,
  ScoreEntryModel
} from 'tods-competition-factory/score-entry-state';

export {
  DEFAULT_MATCH_UP_FORMAT,
  typeDigit,
  setCell,
  clearCell,
  clearScore,
  clearAll,
  chooseEnding,
  changeFormat,
  switchApproach,
  replaceSets,
  readCell,
  gamesLoser,
  isEntered,
  isEmptyEntry,
  setCountOf,
  isFinalSetIndex,
  deciderSetNumberOf,
  decidingIndex,
  enteredFactorySets,
  toFactorySet
} from 'tods-competition-factory/score-entry-state';
export type {
  ScoreEntryApproach,
  SetEntry,
  CellRef,
  ScoreEntryModel,
  EndingIntent,
  TypeDigitIntent
} from 'tods-competition-factory/score-entry-state';

/** A recorded matchUp the score state hydrates from, with its status held as a string (see `statusBoundary.ts`). */
export type RecordedMatchUpReason = Omit<RecordedReason, 'matchUpStatus'> & { matchUpStatus?: string };

export type CreateScoreEntryModelParams = Omit<FactoryParams, 'matchUp'> & { matchUp?: RecordedMatchUpReason };

/** The score state for a matchUp, empty or hydrated from a recorded one. */
export function createScoreEntryModel(params: CreateScoreEntryModelParams = {}): ScoreEntryModel {
  return createFactoryModel({ ...params, matchUp: withStatus(params.matchUp) });
}
