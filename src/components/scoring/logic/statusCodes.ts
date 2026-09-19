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
  matchUpStatus: string | undefined,
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
