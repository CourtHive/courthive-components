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

import { matchUpStatusConstants, entryStatusConstants } from 'tods-competition-factory';

const { WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT } = matchUpStatusConstants;

/**
 * `WITHDRAWN` is an ENTRY status, not a matchUpStatus — `matchUpStatusConstants.WITHDRAWN` does not
 * exist. The USTA policy nonetheless keys a `matchUpStatusCodes` group with it, which is why it is
 * imported from the entry-status constants here. See `withdrawalGroupKey` below.
 */
const { WITHDRAWN } = entryStatusConstants;

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
 * EVERY group key a status reads its codes from, in offer order.
 *
 * A walkover reads two. CA, 2026-09-27:
 *
 *   "WITHDRAWN is a statusCode on a WALKOVER... WALKOVER (withdrawn injured or withdrawn ill)"
 *
 * A withdrawal is not its own matchUpStatus — it produces a WALKOVER, and "Wd [inj]" is the reason
 * that walkover displays. The USTA policy files those five codes (`Wd [inj]`, `Wd [ill]`, `Wd [pc]`,
 * `Wd/Wd`, `Wd [Tae]`) under a key taken from `entryStatusConstants.WITHDRAWN`, so a lookup keyed on
 * the matchUpStatus alone finds WALKOVER's group and stops — and those five never reach the operator.
 * Measured: a walkover offered 6 codes (W1, W2, W3, WOWO, W4, W5) where the policy authors 11.
 *
 * This is the same reasoning the double-exit mapping above already uses — "they are walkovers and
 * defaults" — applied to the axis it had not been applied to. A double walkover therefore reaches
 * `Wd/Wd`, "Double withdrawal", which is precisely what the USTA convention displays for two
 * withdrawals.
 *
 * Order matters and is deliberate: WALKOVER's own codes first, withdrawal reasons after, so an
 * existing picker's first rows do not move.
 */
export function groupKeysForStatus(matchUpStatus: string | undefined): string[] {
  const key = groupKeyForStatus(matchUpStatus);
  if (!key) return [];
  return key === WALKOVER ? [WALKOVER, WITHDRAWN] : [key];
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
  const keys = groupKeysForStatus(matchUpStatus);
  if (!groups || !keys.length) return [];

  // Concatenated rather than merged by code: two groups authoring the same code would be a policy
  // error, and silently de-duplicating it would hide that. A policy carrying only one of the keys
  // (every non-USTA policy today) yields exactly what it did before.
  return keys
    .flatMap((key) => (Array.isArray(groups[key]) ? groups[key] : []))
    .filter((entry) => !!normalizeStatusCode(entry));
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
