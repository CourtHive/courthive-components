import { AcceptanceEntry, EntryChange, TopologyState } from '../types';
export declare const ACCEPTED = "DIRECT_ACCEPTANCE";
export declare const ALTERNATE = "ALTERNATE";
/** The entries the line runs through, in the host's ranked order. */
export declare function linePool(entries: AcceptanceEntry[]): AcceptanceEntry[];
/** Selected entries the line never moves: wildcards, exemptions, qualifiers and the rest of the selected statuses. */
export declare function heldEntries(entries: AcceptanceEntry[]): AcceptanceEntry[];
/** Where the line stands with no cut: as many accepted as are accepted today. */
export declare function currentCut(pool: AcceptanceEntry[]): number;
/** A cut kept within the pool: 0 (nobody accepted) to every entry. */
export declare function clampCut(pool: AcceptanceEntry[], cut: number): number;
/** The status the line gives an entry at `index`, for a cut; with no cut, the entry's own. */
export declare function statusAt(pool: AcceptanceEntry[], index: number, cut?: number): string;
/** The entries whose status a cut changes. No cut, no changes. */
export declare function entryChangesAt(pool: AcceptanceEntry[], cut?: number): EntryChange[];
/** The pending changes in a line: `3 DA → ALT · 1 ALT → DA`. Empty with none. */
export declare function changeSummary(changes: EntryChange[]): string;
/** The changes as a stable key, for the fit cache: the fit is asked again when they change. */
export declare function changesKey(changes: EntryChange[]): string;
/** Entries with the exact pending proposal applied, before any per-stage line adjustments. */
export declare function proposalEntries(entries: AcceptanceEntry[], changes?: EntryChange[]): AcceptanceEntry[];
/** The main line follows MAIN origins, so its cut can be moved back after a Qualify proposal. */
export declare function stageAcceptanceEntries(entries: AcceptanceEntry[], state: TopologyState, stage: 'MAIN' | 'QUALIFYING'): AcceptanceEntry[];
/** Compose cuts with the proposal, retaining each entry's original source for the atomic write. */
export declare function stageEntryChanges(entries: AcceptanceEntry[], state: TopologyState): EntryChange[];
