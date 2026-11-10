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
import type { AcceptanceEntry, EntryChange, TopologyState } from '../types';

export const ACCEPTED = 'DIRECT_ACCEPTANCE';
export const ALTERNATE = 'ALTERNATE';
const WITHDRAWN = 'WITHDRAWN';
const LINE_STATUSES = new Set([ACCEPTED, ALTERNATE]);

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
    return to === entry.entryStatus
      ? []
      : [
          {
            participantId: entry.participantId,
            from: entry.entryStatus,
            to,
            ...(entry.entryStage && entry.entryStage !== 'MAIN' && { fromStage: entry.entryStage })
          }
        ];
  });
}

/** The pending changes in a line: `3 DA → ALT · 1 ALT → DA`. Empty with none. */
export function changeSummary(changes: EntryChange[]): string {
  const groups = new Map<string, { from: string; to: string; count: number }>();
  for (const change of changes) {
    const from = change.fromStage ?? 'MAIN';
    const to = change.toStage ?? from;
    const key = `${from}:${change.from}:${to}:${change.to}`;
    const group = groups.get(key) ?? {
      from: change.from,
      to: to !== from ? `${to} ${change.to}` : change.to,
      count: 0
    };
    group.count++;
    groups.set(key, group);
  }
  const label = (status: string): string =>
    status.startsWith('QUALIFYING ')
      ? `Q ${label(status.slice(11))}`
      : ({ DIRECT_ACCEPTANCE: 'DA', ALTERNATE: 'ALT', WILDCARD: 'WC' }[status] ?? status);
  return [...groups.values()]
    .sort((a, b) => Number(b.to === ALTERNATE) - Number(a.to === ALTERNATE))
    .map(({ from, to, count }) => `${count} ${label(from)} → ${label(to)}`)
    .join(' · ');
}

/** The changes as a stable key, for the fit cache: the fit is asked again when they change. */
export function changesKey(changes: EntryChange[]): string {
  return changes
    .map(
      ({ participantId, to, fromStage, toStage }) =>
        `${fromStage ?? 'MAIN'}:${participantId}:${toStage ?? fromStage ?? 'MAIN'}:${to}`
    )
    .join(',');
}

const sourceKey = (change: EntryChange) => `${change.fromStage ?? 'MAIN'}:${change.participantId}`;
const entryKey = (entry: AcceptanceEntry) => `${entry.entryStage ?? 'MAIN'}:${entry.participantId}`;

/** Entries with the exact pending proposal applied, before any per-stage line adjustments. */
export function proposalEntries(entries: AcceptanceEntry[], changes: EntryChange[] = []): AcceptanceEntry[] {
  const bySource = new Map(changes.map((change) => [sourceKey(change), change]));
  return entries
    .map((entry) => {
      const change = bySource.get(entryKey(entry));
      return change ? { ...entry, entryStatus: change.to, entryStage: change.toStage ?? entry.entryStage } : entry;
    })
    .sort((a, b) => (a.rankOrder ?? 0) - (b.rankOrder ?? 0));
}

/** The main line follows MAIN origins, so its cut can be moved back after a Qualify proposal. */
export function stageAcceptanceEntries(
  entries: AcceptanceEntry[],
  state: TopologyState,
  stage: 'MAIN' | 'QUALIFYING'
): AcceptanceEntry[] {
  if (stage === 'QUALIFYING')
    return mainTrial(entries, state)
      .map(({ current }) => current)
      .filter((entry) => (entry.entryStage ?? 'MAIN') === stage);
  const base = new Map((state.proposalEntryChanges ?? []).map((change) => [sourceKey(change), change]));
  return entries
    .filter((entry) => (entry.entryStage ?? 'MAIN') === 'MAIN')
    .map((entry) => {
      const change = base.get(entryKey(entry));
      if (!change || !LINE_STATUSES.has(entry.entryStatus)) return entry;
      return { ...entry, entryStatus: change.toStage && change.toStage !== 'MAIN' ? ALTERNATE : change.to };
    });
}

function mainTrial(entries: AcceptanceEntry[], state: TopologyState) {
  const effective = proposalEntries(entries, state.proposalEntryChanges);
  const bySource = new Map((state.proposalEntryChanges ?? []).map((change) => [sourceKey(change), change]));
  const cut = state.acceptanceCuts?.MAIN ?? state.acceptanceCut;
  const pool = linePool(entries.filter((entry) => (entry.entryStage ?? 'MAIN') === 'MAIN'));
  const positions = new Map(pool.map((entry, index) => [entryKey(entry), index]));
  const hasQualifying = state.nodes.some((node) => node.stage === 'QUALIFYING');
  // Look up each original through its stage move, rather than zipping lists reordered by ranking.
  return entries
    .map((original) => {
      const change = bySource.get(entryKey(original));
      const stage = change?.toStage ?? original.entryStage ?? 'MAIN';
      let current =
        effective.find(
          (entry) => entry.participantId === original.participantId && (entry.entryStage ?? 'MAIN') === stage
        ) ?? original;
      const index = positions.get(entryKey(original));
      if (cut !== undefined && index !== undefined) {
        const accepted = index < clampCut(pool, cut);
        current = {
          ...current,
          entryStage: accepted || !hasQualifying ? 'MAIN' : 'QUALIFYING',
          entryStatus: accepted || hasQualifying ? ACCEPTED : ALTERNATE
        };
      }
      return { original, current };
    })
    .sort((a, b) => (a.current.rankOrder ?? 0) - (b.current.rankOrder ?? 0));
}

/** Compose cuts with the proposal, retaining each entry's original source for the atomic write. */
export function stageEntryChanges(entries: AcceptanceEntry[], state: TopologyState): EntryChange[] {
  const trial = mainTrial(entries, state);
  const pool = linePool(trial.map(({ current }) => current).filter((entry) => entry.entryStage === 'QUALIFYING'));
  const cut = state.acceptanceCuts?.QUALIFYING;
  const overrides = new Map(entryChangesAt(pool, cut).map((change) => [sourceKey(change), change.to]));
  return trial.flatMap(({ original, current }) => {
    const fromStage = original.entryStage ?? 'MAIN';
    const toStage = current.entryStage ?? 'MAIN';
    const to = overrides.get(entryKey(current)) ?? current.entryStatus;
    if (to === original.entryStatus && toStage === fromStage) return [];
    return [
      {
        participantId: original.participantId,
        from: original.entryStatus,
        to,
        ...(fromStage !== 'MAIN' && { fromStage }),
        ...(toStage !== fromStage && { toStage })
      }
    ];
  });
}
