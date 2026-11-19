/**
 * Reading a scoring policy's `matchUpStatusCodes` vocabulary.
 *
 * The policy refines a matchUpStatus with caller-defined codes — a retirement becomes "Ret [inj]", a default becomes
 * "Def [dq]". The modal renders them; it never invents them. If a tournament's policy carries no codes for the chosen
 * status, there is nothing to show and no control is drawn (CA, 2026-09-20).
 *
 * Which group a status reads, which codes a group offers and which reason a stored matchUp recorded are owned by the
 * factory (`tods-competition-factory/score-entry-state`), with the draft that hydrates from them. What stays here is
 * how a code is DISPLAYED.
 */
import { asStatus, withStatus } from './statusBoundary';
import {
  recordedStatusCode as draftRecordedStatusCode,
  groupKeyForStatus as draftGroupKeyForStatus,
  codesForStatus as draftCodesForStatus
} from 'tods-competition-factory/score-entry-state';

import type { StatusCodeEntry, StatusCodeGroups } from 'tods-competition-factory/score-entry-state';
import type { RecordedMatchUpReason } from './scoreEntryModel';

export { normalizeStatusCode } from 'tods-competition-factory/score-entry-state';
export type { StatusCodeEntry, StatusCodeGroups } from 'tods-competition-factory/score-entry-state';

/** The group a status reads its codes from: a double exit's codes are filed under its base ending. */
export function groupKeyForStatus(matchUpStatus: string | undefined): string | undefined {
  return draftGroupKeyForStatus(asStatus(matchUpStatus));
}

/** The reason code a matchUp recorded, for the control that has to re-display it. */
export function recordedStatusCode(matchUp?: RecordedMatchUpReason): string | undefined {
  return draftRecordedStatusCode(withStatus(matchUp));
}

/** The codes a policy offers for this status, or none. */
export function codesForStatus(
  groups: StatusCodeGroups | undefined,
  matchUpStatus: string | undefined
): StatusCodeEntry[] {
  return draftCodesForStatus(groups, asStatus(matchUpStatus));
}

/**
 * What to show for a code: the policy's display form, falling back to its label, then to the code.
 *
 * The three fields are authored per code and mean different things — `matchUpStatusCodeDisplay` is
 * the terse form an operator recognises ("Ret [inj]"), `label` the prose one ("Injury"). Never
 * synthesise a display from the code: a policy that authored none is saying the code IS the label.
 */
export function statusCodeDisplay(entry: StatusCodeEntry): string {
  return entry.matchUpStatusCodeDisplay || entry.label || entry.matchUpStatusCode;
}

/** The secondary line beside the display form, when the policy authored one that adds something. */
export function statusCodeSubtext(entry: StatusCodeEntry): string | undefined {
  const display = statusCodeDisplay(entry);
  const candidate = entry.label && entry.label !== display ? entry.label : entry.description;
  return candidate && candidate !== display ? candidate : undefined;
}
