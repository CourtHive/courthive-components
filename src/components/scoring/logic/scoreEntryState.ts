/**
 * The ENDING half of a score-entry draft — now owned by the factory (`tods-competition-factory/score-entry-state`).
 *
 * An ending is chosen ON a player's row, which names the side it happened to, so the winner is already known and the
 * old separate winner question is gone. Re-exported under the names the card and the tests have always imported.
 */
import { asStatus, withStatus } from './statusBoundary';
import {
  hydrateScoreEntryState as hydrateDraftEnding,
  resolveReportedEnding as resolveDraftReportedEnding
} from 'tods-competition-factory/score-entry-state';

import type { ScoreEntryResolution, ScoreEntryState } from 'tods-competition-factory/score-entry-state';
import type { RecordedMatchUpReason } from './scoreEntryModel';

export {
  emptyScoreEntryState,
  chooseSideEnding,
  chooseMatchEnding,
  toggleBothSidesOut,
  offersBothSidesOut,
  chooseReasonCode,
  reasonCodeStatus,
  resolveScoreEntry,
  sideEndingOptions,
  matchEndingOptions
} from 'tods-competition-factory/score-entry-state';
export type { ScoreEntryState, ScoreEntryResolution, SideNumber } from 'tods-competition-factory/score-entry-state';

/** The ending of a matchUp that already has an outcome (its status held as a string). */
export function hydrateScoreEntryState(matchUp?: RecordedMatchUpReason): ScoreEntryState {
  return hydrateDraftEnding(withStatus(matchUp));
}

/** A resolution for an ending a score region reported rather than the operator selected. */
export function resolveReportedEnding(matchUpStatus?: string, winningSide?: number): ScoreEntryResolution {
  return resolveDraftReportedEnding(asStatus(matchUpStatus), winningSide);
}
