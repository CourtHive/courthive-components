/**
 * Fit mode's reading of the factory's `getDrawFit` — which structure is which node, what a card says, what a lever
 * does. Pure: no DOM, no engine.
 *
 * Only the structures that TAKE ENTRIES have a fit: the main structure and each qualifying structure. Playoffs and
 * consolations are filled by results, not entries, so they have nothing to fit. The mapping follows
 * `topologyToDrawOptions`, which makes the draw the fit is asked about: the FIRST main node is the generated main
 * structure, and each qualifying node is passed to the generator under its own name.
 */
import { drawDefinitionConstants, entryStatusConstants } from 'tods-competition-factory';
import { steppedQualifierCount } from './qualifierCounts';

import type { DrawFit, FitLedgerStage, StructureFit, TopologyNode, TopologyState } from '../types';

const { MAIN, QUALIFYING, ROUND_ROBIN, SINGLE_ELIMINATION } = drawDefinitionConstants;

/** Each node's structure fit, keyed by node id. */
export function fitByNode(state: TopologyState, fit: DrawFit | undefined): Map<string, StructureFit> {
  const byNode = new Map<string, StructureFit>();
  const structures = fit?.structures ?? [];
  const mainNode = state.nodes.find((node) => node.stage === MAIN);
  const mainFit = structures.find((s) => s.stage === MAIN && (s.stageSequence ?? 1) === 1);
  if (mainNode && mainFit) byNode.set(mainNode.id, mainFit);

  const qualifyingFits = structures.filter((s) => s.stage === QUALIFYING);
  const qualifyingNodes = state.nodes.filter((node) => node.stage === QUALIFYING);
  qualifyingNodes.forEach((node, index) => {
    const named = qualifyingFits.find((s) => s.structureName === node.structureName);
    const structureFit =
      named ?? (qualifyingFits.length === qualifyingNodes.length ? qualifyingFits[index] : undefined);
    if (structureFit) byNode.set(node.id, structureFit);
  });
  return byNode;
}

/** Whether a node takes entries, and so has a fit to show. */
export function takesEntries(node: TopologyNode, state: TopologyState): boolean {
  if (node.stage === QUALIFYING) return true;
  return node.stage === MAIN && state.nodes.find((n) => n.stage === MAIN)?.id === node.id;
}

/**
 * The fit-relevant shape of a topology: what `getDrawFit` is asked again for when it changes. Positions and selection
 * are not part of it, so dragging or selecting a card reuses the last answer.
 */
export function fitKey(state: TopologyState): string {
  const nodes = state.nodes.map((n) => [
    n.id,
    n.stage,
    n.structureName,
    n.structureType,
    n.drawSize,
    n.qualifyingPositions ?? null,
    n.seedsCount ?? null,
    JSON.stringify(n.structureOptions ?? null)
  ]);
  const edges = state.edges.map((e) => [
    e.sourceNodeId,
    e.targetNodeId,
    e.linkType,
    e.sourceRoundNumber ?? null,
    e.targetRoundNumber ?? null,
    (e.finishingPositions ?? []).join(',')
  ]);
  return JSON.stringify([nodes, edges, state.constraintOverrides ?? null]);
}

/** A card's one-line reading of its fit. */
export function fitSentence(fit: StructureFit): string {
  if (fit.status === 'EMPTY') return `No entries yet · ${fit.positions} positions`;
  const parts = [`${fit.placed} entered`];
  if (fit.qualifierSlots) parts.push(`${fit.qualifierSlots} qualifier${fit.qualifierSlots === 1 ? '' : 's'}`);
  if (fit.byes) {
    const toSeeds = fit.seedByes ? ` (${fit.seedByes} to seeds)` : '';
    parts.push(`${fit.byes} BYE${fit.byes === 1 ? '' : 's'}${toSeeds}`);
  }
  if (fit.notPlaced) parts.push(`${fit.notPlaced} not placed`);
  return parts.join(' · ');
}

/** The status as the card's badge reads it. */
export const FIT_STATUS_TEXT: Record<StructureFit['status'], string> = {
  FITS: 'Fits',
  OVER: 'Over',
  SHORT: 'Short',
  EMPTY: 'Empty'
};

/** Short names for the entry statuses a ledger counts. */
const STATUS_ABBREVIATION: Record<string, string> = {
  DIRECT_ACCEPTANCE: 'DA',
  WILDCARD: 'WC',
  SPECIAL_EXEMPT: 'SE',
  JUNIOR_EXEMPT: 'JE',
  ORGANISER_ACCEPTANCE: 'OA',
  CONFIRMED: 'CF',
  LUCKY_LOSER: 'LL',
  QUALIFIER: 'Q'
};

const STATUS_ORDER = Object.keys(STATUS_ABBREVIATION);

/**
 * A stage's selected statuses in a fixed order — DA, WC, SE, JE, OA, CF, LL, Q, then any other by name — not the order
 * the entries are first met in. That followed the event's entries, so one event read `24 DA · 4 WC` or `4 WC · 24 DA`
 * by the order its wildcards were added.
 */
function orderedStatuses(selected: Record<string, number>): [string, number][] {
  const rank = (status: string) => {
    const index = STATUS_ORDER.indexOf(status);
    return index < 0 ? STATUS_ORDER.length : index;
  };
  return Object.entries(selected).sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

/** One stage's ledger as the footer reads it: `24 DA · 4 WC · 6 ALT · 2 WD`. */
export function ledgerLine(ledger: FitLedgerStage): string {
  const parts = orderedStatuses(ledger.selected).map(
    ([status, count]) => `${count} ${STATUS_ABBREVIATION[status] ?? status}`
  );
  if (ledger.alternates) parts.push(`${ledger.alternates} ALT`);
  if (ledger.withdrawn) parts.push(`${ledger.withdrawn} WD`);
  return parts.length ? parts.join(' · ') : 'no entries';
}

/** The footer's whole ledger: each stage that has entries, main first, then what was not placed. */
export function ledgerText(fit: DrawFit | undefined): string {
  if (!fit) return '';
  const stages = Object.keys(fit.ledger ?? {}).sort((a, b) => (a === MAIN ? -1 : b === MAIN ? 1 : a.localeCompare(b)));
  const lines = stages.map((stage) => `${stage === MAIN ? 'Main' : 'Qualifying'}  ${ledgerLine(fit.ledger![stage])}`);
  const notPlaced = fit.notPlaced?.length ?? 0;
  if (notPlaced) lines.push(`${notPlaced} not placed`);
  return lines.length ? lines.join('   |   ') : 'No entries yet';
}

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

const ALTERNATE = 'ALTERNATE';
const WITHDRAWN = 'WITHDRAWN';
const NOT_PLACED = 'NOT_PLACED';
const SELECTED_STATUSES = new Set<string>(entryStatusConstants.STRUCTURE_SELECTED_STATUSES);

const titleCase = (status: string) => status.charAt(0) + status.slice(1).toLowerCase().replaceAll('_', ' ');

/**
 * The ledger the factory's fit reports, built from the host's entries instead — for when there is no fit to read:
 * before a main structure exists the director still needs to see what the event holds (CA, 2026-11-16).
 */
export function entryLedger(entries: { entryStage?: string; entryStatus: string }[]): Record<string, FitLedgerStage> {
  const ledger: Record<string, FitLedgerStage> = {};
  for (const entry of entries) {
    const stage = entry.entryStage ?? MAIN;
    const row = (ledger[stage] ??= { selected: {}, selectedCount: 0, alternates: 0, withdrawn: 0, other: {} });
    const status = entry.entryStatus;
    if (SELECTED_STATUSES.has(status)) {
      row.selected[status] = (row.selected[status] ?? 0) + 1;
      row.selectedCount += 1;
    } else if (status === ALTERNATE) row.alternates += 1;
    else if (status === WITHDRAWN) row.withdrawn += 1;
    else row.other[status] = (row.other[status] ?? 0) + 1;
  }
  return ledger;
}

/** The footer's ledger as chips: each stage that has entries, main first, then what was not placed. */
export function ledgerGroups(ledger: Record<string, FitLedgerStage> = {}, notPlaced = 0): LedgerGroup[] {
  const chip = (status: string, count: number, label: string): LedgerChip => ({
    status,
    count,
    label: `${count} ${label}`,
    title: `${count} ${titleCase(status)}`
  });
  const stages = Object.keys(ledger).sort((a, b) => (a === MAIN ? -1 : b === MAIN ? 1 : a.localeCompare(b)));
  const groups = stages.map((stage) => {
    const row = ledger[stage];
    const chips = [
      ...orderedStatuses(row.selected).map(([status, count]) =>
        chip(status, count, STATUS_ABBREVIATION[status] ?? status)
      ),
      ...(row.alternates ? [chip(ALTERNATE, row.alternates, 'ALT')] : []),
      ...(row.withdrawn ? [chip(WITHDRAWN, row.withdrawn, 'WD')] : []),
      ...Object.entries(row.other ?? {}).map(([status, count]) =>
        chip(status, count, STATUS_ABBREVIATION[status] ?? status)
      )
    ];
    return { stage, label: stage === MAIN ? 'Main' : titleCase(stage), chips };
  });
  if (notPlaced)
    groups.push({
      stage: NOT_PLACED,
      label: '',
      chips: [
        {
          status: NOT_PLACED,
          count: notPlaced,
          label: `${notPlaced} not placed`,
          title: 'Entries the draw has no position for'
        }
      ]
    });
  return groups;
}

const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

/**
 * The size a node takes one step up or down: an elimination draw doubles or halves (feed-in sizes are reached by a
 * size typed in the node editor); a round robin grows or shrinks by a group; anything else by one. Undefined where
 * the step would leave the valid range.
 */
export function steppedDrawSize(node: TopologyNode, direction: 1 | -1): number | undefined {
  const size = node.drawSize;
  if (node.structureType === ROUND_ROBIN) {
    const groupSize = node.structureOptions?.groupSize || 4;
    const next = size + direction * groupSize;
    return next >= groupSize ? next : undefined;
  }
  if (node.structureType === SINGLE_ELIMINATION && isPowerOf2(size)) {
    const next = direction > 0 ? size * 2 : size / 2;
    return next >= 2 && next <= 1024 ? next : undefined;
  }
  const next = size + direction;
  return next >= 2 ? next : undefined;
}

/**
 * A qualifying node's qualifier count one step up or down, among the counts its structure can produce. It stepped by
 * one, so 40 entrants reached 18 qualifiers, which no structure of 40 produces (CA, 2026-11-17).
 */
export function steppedQualifiers(node: TopologyNode, direction: 1 | -1): number | undefined {
  return steppedQualifierCount(node, direction);
}
