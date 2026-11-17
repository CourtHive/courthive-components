import { DrawFit, FitLedgerStage, StructureFit, TopologyNode, TopologyState } from '../types';
/** Each node's structure fit, keyed by node id. */
export declare function fitByNode(state: TopologyState, fit: DrawFit | undefined): Map<string, StructureFit>;
/** Whether a node takes entries, and so has a fit to show. */
export declare function takesEntries(node: TopologyNode, state: TopologyState): boolean;
/**
 * The fit-relevant shape of a topology: what `getDrawFit` is asked again for when it changes. Positions and selection
 * are not part of it, so dragging or selecting a card reuses the last answer.
 */
export declare function fitKey(state: TopologyState): string;
/** A card's one-line reading of its fit. */
export declare function fitSentence(fit: StructureFit): string;
/** The status as the card's badge reads it. */
export declare const FIT_STATUS_TEXT: Record<StructureFit['status'], string>;
/** One stage's ledger as the footer reads it: `24 DA · 4 WC · 6 ALT · 2 WD`. */
export declare function ledgerLine(ledger: FitLedgerStage): string;
/** The footer's whole ledger: each stage that has entries, main first, then what was not placed. */
export declare function ledgerText(fit: DrawFit | undefined): string;
/** One count in the footer's ledger: `24 DA`, with the status spelled out for its title. */
export interface LedgerChip {
    status: string;
    count: number;
    label: string;
    title: string;
}
/** One stage's chips, or the warning chip for entries the draw has no place for. */
export interface LedgerGroup {
    stage: string;
    label: string;
    chips: LedgerChip[];
}
/**
 * The ledger the factory's fit reports, built from the host's entries instead — for when there is no fit to read:
 * before a main structure exists the director still needs to see what the event holds (CA, 2026-11-16).
 */
export declare function entryLedger(entries: {
    entryStage?: string;
    entryStatus: string;
}[]): Record<string, FitLedgerStage>;
/** The footer's ledger as chips: each stage that has entries, main first, then what was not placed. */
export declare function ledgerGroups(ledger?: Record<string, FitLedgerStage>, notPlaced?: number): LedgerGroup[];
/**
 * The size a node takes one step up or down: an elimination draw doubles or halves (feed-in sizes are reached by a
 * size typed in the node editor); a round robin grows or shrinks by a group; anything else by one. Undefined where
 * the step would leave the valid range.
 */
export declare function steppedDrawSize(node: TopologyNode, direction: 1 | -1): number | undefined;
/** A qualifying node's qualifier count one step up or down, within one and half its size. */
export declare function steppedQualifiers(node: TopologyNode, direction: 1 | -1): number | undefined;
