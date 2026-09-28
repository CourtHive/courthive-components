/**
 * Reading a scoring policy's `matchUpStatusCodes` vocabulary.
 *
 * The policy refines a matchUpStatus with caller-defined codes — a retirement becomes "Ret [inj]",
 * a default becomes "Def [dq]". The modal renders them; it never invents them. If a tournament's
 * policy carries no codes for the chosen status, there is nothing to show and no control is drawn.
 * That is the designed state, not a degraded one: CA, 2026-09-20 — TMX ships no built-in default,
 * so the reason field exists exactly where a governing body's vocabulary applies and nowhere else.
 *
 * No DOM, no side effects.
 */

import { matchUpStatusConstants } from 'tods-competition-factory';
import { isDoubleExitStatus, requiresWinner } from './irregularEnding';

const { WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT } = matchUpStatusConstants;

/**
 * One entry of a policy's code group, as the factory's fixtures ship it.
 *
 * CA settled the canonical shape on 2026-09-19: the OBJECT form is authoritative, because a bare
 * string cannot carry the display text the picker exists to render.
 */
export type StatusCodeEntry = {
  matchUpStatusCode: string;
  matchUpStatusCodeDisplay?: string;
  label?: string;
  description?: string;
};

/** A policy's groups, keyed by the matchUpStatus each refines. */
export type StatusCodeGroups = Record<string, StatusCodeEntry[]>;

/**
 * The group key a status reads its codes from.
 *
 * A double exit has no group of its own — the policy files "Wo/Wo" inside WALKOVER and "Def/Def"
 * inside DEFAULTED, because they are walkovers and defaults. Mapping them here is what keeps the
 * double-exit choice and the code list from becoming two controls that can disagree.
 */
export function groupKeyForStatus(matchUpStatus: string | undefined): string | undefined {
  if (matchUpStatus === DOUBLE_WALKOVER) return WALKOVER;
  if (matchUpStatus === DOUBLE_DEFAULT) return DEFAULTED;
  return matchUpStatus;
}

/**
 * Normalise one element of a code group, or of a matchUp's `matchUpStatusCodes`, to its code string.
 *
 * Three shapes are legitimate and all three occur. `matchUpStatusCodes` on a matchUp is an `any[]`
 * shared by three tenants (policy codes, propagation provenance, and `{ code }` wrappers), and
 * `updateMatchUpStatusCodes` in the factory rewraps every string element as `{ code }` — so a code
 * written as `'RJ'` reads back as `{ code: 'RJ' }` once propagation has touched the matchUp. A
 * reader that assumes a string is wrong, and it is wrong only sometimes, which is worse.
 *
 * Returns `undefined` for a provenance element, which carries no code at all.
 */
/**
 * The reason code a matchUp actually recorded, for the control that has to re-display it.
 *
 * ── Why not `matchUpStatusCodes[0]` ──
 *
 * `matchUpStatusCodes` is POSITIONAL BY SIDE, so a reason belonging to side 2 sits at index 1 and
 * index 0 is an empty string that `normalizeStatusCode` turns into `undefined`. The picker then opens
 * empty, the operator's reason is missing from the control meant to show it, and re-saving loses it.
 *
 * Measured against published **7.1.0**, because the exposure is narrower than it first looks: a code
 * submitted by this dialog is stored EXACTLY as submitted, so `['W1']` round-trips through index 0 and
 * reads correctly today. The index-1 case arrives by PROPAGATION — a reason carried into a connected
 * structure is placed at the arriving side's index — and factory #5016 both fixes that carry and gives
 * the fact a home that states what it attributes to.
 *
 * ── The order, and why each step is needed ──
 *
 * 1. `sideStatusCodes[sideNumber]` — the side's own, once the factory writes it.
 * 2. `matchUpStatusCode` — the MATCH's, for an ending that resolves nobody (ABANDONED, CANCELLED,
 *    INCOMPLETE). There is no side to ask.
 * 3. `matchUpStatusCodes[0]` — records written before either field existed. Not optional: the peer
 *    range still admits a factory major that has neither, so dropping it would read nothing at all
 *    from every record stored to date.
 *
 * The fields are mirrored onto this package's own `MatchUp` rather than imported from the factory, for
 * the reason `types.ts` already records: they do not exist in the older major the peer range admits.
 */
export function recordedStatusCode(matchUp?: {
  matchUpStatus?: string;
  winningSide?: number;
  sideStatusCodes?: Record<number, string>;
  matchUpStatusCode?: string;
  matchUpStatusCodes?: unknown[];
}): string | undefined {
  const side = reasonSide(matchUp);
  const fromSide = side === undefined ? undefined : normalizeStatusCode(matchUp?.sideStatusCodes?.[side]);

  return (
    fromSide ?? normalizeStatusCode(matchUp?.matchUpStatusCode) ?? normalizeStatusCode(matchUp?.matchUpStatusCodes?.[0])
  );
}

/**
 * Which side's reason a dialog is showing, or `undefined` where no side owns one.
 *
 * A single exit attributes to the side that did NOT win, so `3 - winningSide`. A double exit puts the
 * same code on both, so either side answers and side 1 is read. An ending that resolves nobody has no
 * side at all — that is what the match-level field exists for.
 */
function reasonSide(matchUp?: { matchUpStatus?: string; winningSide?: number }): number | undefined {
  if (!requiresWinner(matchUp?.matchUpStatus)) return isDoubleExitStatus(matchUp?.matchUpStatus) ? 1 : undefined;
  if (matchUp?.winningSide !== 1 && matchUp?.winningSide !== 2) return undefined;

  return 3 - matchUp.winningSide;
}

export function normalizeStatusCode(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry || undefined;
  if (!entry || typeof entry !== 'object') return undefined;

  const record = entry as Record<string, unknown>;
  const value = record.matchUpStatusCode ?? record.code;
  return typeof value === 'string' && value ? value : undefined;
}

/**
 * The codes a policy offers for this status, or an empty list when it offers none.
 *
 * Entries without a `matchUpStatusCode` are dropped rather than rendered as a blank option — an
 * unpickable row in a picker is worse than a shorter picker.
 */
export function codesForStatus(
  groups: StatusCodeGroups | undefined,
  matchUpStatus: string | undefined
): StatusCodeEntry[] {
  const key = groupKeyForStatus(matchUpStatus);
  if (!groups || !key) return [];

  const group = groups[key];
  if (!Array.isArray(group)) return [];

  return group.filter((entry) => !!normalizeStatusCode(entry));
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
