/**
 * The acceptance line (TOPOLOGY_FIT_MODE.md § levers, step 3; CA 2026-11-08): a cut through the MAIN entries, ranked
 * by the host, that decides who takes a position and who waits — by ranking, by the director, not by the
 * generator's order. Pure: no DOM, no engine.
 *
 *   - the line runs through DIRECT_ACCEPTANCE and ALTERNATE entries only. Wildcards, exemptions and the other
 *     selected statuses are held above it, and withdrawals are out of it: the line never moves a wildcard
 *   - no cut is today's statuses: nothing changes until the director moves the line
 *   - a cut at K accepts the first K by ranking and makes the rest alternates. The entries whose status that
 *     changes are the pending entry changes, applied by the host together with the generation, or discarded
 */
import type { AcceptanceEntry, EntryChange } from '../types';

export const ACCEPTED = 'DIRECT_ACCEPTANCE';
export const ALTERNATE = 'ALTERNATE';
const WITHDRAWN = 'WITHDRAWN';

/** The entries the line runs through, in the host's ranked order. */
export function linePool(entries: AcceptanceEntry[]): AcceptanceEntry[] {
  return entries.filter(({ entryStatus }) => entryStatus === ACCEPTED || entryStatus === ALTERNATE);
}

/** Selected entries the line never moves: wildcards, exemptions, qualifiers and the rest of the selected statuses. */
export function heldEntries(entries: AcceptanceEntry[]): AcceptanceEntry[] {
  return entries.filter(
    ({ entryStatus }) => entryStatus !== ACCEPTED && entryStatus !== ALTERNATE && entryStatus !== WITHDRAWN
  );
}

/** Where the line stands with no cut: as many accepted as are accepted today. */
export function currentCut(pool: AcceptanceEntry[]): number {
  return pool.filter(({ entryStatus }) => entryStatus === ACCEPTED).length;
}

/** A cut kept within the pool: 0 (nobody accepted) to every entry. */
export function clampCut(pool: AcceptanceEntry[], cut: number): number {
  return Math.min(Math.max(Math.round(cut), 0), pool.length);
}

/** The status the line gives an entry at `index`, for a cut; with no cut, the entry's own. */
export function statusAt(pool: AcceptanceEntry[], index: number, cut?: number): string {
  if (cut === undefined) return pool[index]?.entryStatus;
  return index < cut ? ACCEPTED : ALTERNATE;
}

/** The entries whose status a cut changes. No cut, no changes. */
export function entryChangesAt(pool: AcceptanceEntry[], cut?: number): EntryChange[] {
  if (cut === undefined) return [];
  const bounded = clampCut(pool, cut);
  return pool.flatMap((entry, index) => {
    const to = statusAt(pool, index, bounded);
    return to === entry.entryStatus ? [] : [{ participantId: entry.participantId, from: entry.entryStatus, to }];
  });
}

/** The pending changes in a line: `3 DA → ALT · 1 ALT → DA`. Empty with none. */
export function changeSummary(changes: EntryChange[]): string {
  const demoted = changes.filter(({ to }) => to === ALTERNATE).length;
  const promoted = changes.filter(({ to }) => to === ACCEPTED).length;
  const parts = [];
  if (demoted) parts.push(`${demoted} DA → ALT`);
  if (promoted) parts.push(`${promoted} ALT → DA`);
  return parts.join(' · ');
}

/** The changes as a stable key, for the fit cache: the fit is asked again when they change. */
export function changesKey(changes: EntryChange[]): string {
  return changes.map(({ participantId, to }) => `${participantId}:${to}`).join(',');
}
