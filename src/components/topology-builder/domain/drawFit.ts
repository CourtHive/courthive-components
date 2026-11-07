/**
 * Fit mode's reading of the factory's `getDrawFit` — which structure is which node, what a card says, what a lever
 * does. Pure: no DOM, no engine.
 *
 * Only the structures that TAKE ENTRIES have a fit: the main structure and each qualifying structure. Playoffs and
 * consolations are filled by results, not entries, so they have nothing to fit. The mapping follows
 * `topologyToDrawOptions`, which makes the draw the fit is asked about: the FIRST main node is the generated main
 * structure, and each qualifying node is passed to the generator under its own name.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';

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
  return JSON.stringify([nodes, edges]);
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

/** One stage's ledger as the footer reads it: `24 DA · 4 WC · 6 ALT · 2 WD`. */
export function ledgerLine(ledger: FitLedgerStage): string {
  const parts = Object.entries(ledger.selected).map(
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

/** A qualifying node's qualifier count one step up or down, within one and half its size. */
export function steppedQualifiers(node: TopologyNode, direction: 1 | -1): number | undefined {
  const current = node.qualifyingPositions || Math.floor(node.drawSize / 4);
  const next = current + direction;
  return next >= 1 && next <= Math.floor(node.drawSize / 2) ? next : undefined;
}
