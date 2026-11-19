import { StatusCodeEntry, StatusCodeGroups } from 'tods-competition-factory/score-entry-state';
import { RecordedMatchUpReason } from './scoreEntryModel';
export { normalizeStatusCode } from 'tods-competition-factory/score-entry-state';
export type { StatusCodeEntry, StatusCodeGroups } from 'tods-competition-factory/score-entry-state';
/** The group a status reads its codes from: a double exit's codes are filed under its base ending. */
export declare function groupKeyForStatus(matchUpStatus: string | undefined): string | undefined;
/** The reason code a matchUp recorded, for the control that has to re-display it. */
export declare function recordedStatusCode(matchUp?: RecordedMatchUpReason): string | undefined;
/** The codes a policy offers for this status, or none. */
export declare function codesForStatus(groups: StatusCodeGroups | undefined, matchUpStatus: string | undefined): StatusCodeEntry[];
/**
 * What to show for a code: the policy's display form, falling back to its label, then to the code.
 *
 * The three fields are authored per code and mean different things — `matchUpStatusCodeDisplay` is
 * the terse form an operator recognises ("Ret [inj]"), `label` the prose one ("Injury"). Never
 * synthesise a display from the code: a policy that authored none is saying the code IS the label.
 */
export declare function statusCodeDisplay(entry: StatusCodeEntry): string;
/** The secondary line beside the display form, when the policy authored one that adds something. */
export declare function statusCodeSubtext(entry: StatusCodeEntry): string | undefined;
