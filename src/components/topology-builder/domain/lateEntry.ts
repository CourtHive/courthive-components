/**
 * Late entry into MAIN (CA, 2026-11-18, decision 1 of planning/2026-11-17-qualifying-entry-routing.md).
 *
 * A FEED_IN MAIN's fed positions enter after round 1. Two claims compete for them: the seeds, which the factory gives
 * the fed positions latest round first, and the qualifiers the topology routes to a later round (a stronger qualifying
 * field earns R3). A 40 enters 8 at R3; with 8 seeds and 8 R3 qualifiers, the qualifiers have nowhere to go and the
 * draw does not generate. The answer is a feed round stacked after the qualifiers' round: a 48 as [8, 8] enters the
 * qualifiers at R3 and the seeds at R4.
 */
import { eliminationRounds, feedRoundsProfileOf } from './feedRounds';
import { carriesQualifiers } from './edgeTraversal';
import { qualifiersOf } from './qualifierCounts';
import type { TopologyNode, TopologyState } from '../types';

/** One round MAIN's fed positions enter, and who takes them. */
export interface LateEntryRound {
  roundNumber: number;
  capacity: number;
  seeds: number;
  qualifiers: number;
}

export interface LateEntry {
  rounds: LateEntryRound[];
  /** Rounds whose qualifiers do not fit beside the seeds there. */
  short: LateEntryRound[];
  /** A MAIN that fits them: one more feed round after the short round, for the seeds. */
  proposal?: { drawSize: number; feedRoundsProfile: number[] };
}

/** Qualifiers routed to each MAIN round after the first. */
function lateQualifiers(main: TopologyNode, state: TopologyState): Map<number, number> {
  const demand = new Map<number, number>();
  for (const edge of state.edges) {
    if (edge.targetNodeId !== main.id || !carriesQualifiers(edge, state.nodes)) continue;
    const roundNumber = edge.targetRoundNumber || 1;
    const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
    if (roundNumber <= 1 || !source) continue;
    demand.set(roundNumber, (demand.get(roundNumber) ?? 0) + qualifiersOf(source));
  }
  return demand;
}

/** The fed rounds of MAIN at `drawSize`, seeds placed latest round first, and the qualifiers routed to each. */
function lateRounds(
  drawSize: number,
  structureOptions: any,
  seedsCount: number,
  demand: Map<number, number>
): LateEntryRound[] {
  const rounds = eliminationRounds(drawSize, structureOptions)
    .map(({ count, isFeed }, i) => ({ roundNumber: i + 1, capacity: isFeed ? count : 0 }))
    .filter(({ capacity }) => capacity);
  let seedsLeft = seedsCount;
  const placed = rounds.toReversed().map((round) => {
    const seeds = Math.min(seedsLeft, round.capacity);
    seedsLeft -= seeds;
    return { ...round, seeds, qualifiers: demand.get(round.roundNumber) ?? 0 };
  });
  return placed.toReversed();
}

const isShort = (round: LateEntryRound) => round.qualifiers > round.capacity - round.seeds;

/**
 * Whether MAIN's fed positions hold its seeds and the qualifiers routed after round 1, and, when they do not, the
 * MAIN that would: the short round's feed size stacked once more after it, for the seeds. Undefined when nothing is
 * routed after round 1. A qualifier routed to a round that is not fed is short with a capacity of 0, and has no
 * proposal: the validator already names that round.
 */
export function lateEntry(main: TopologyNode, state: TopologyState, seedsCount = 0): LateEntry | undefined {
  const demand = lateQualifiers(main, state);
  if (!demand.size) return undefined;

  const rounds = lateRounds(main.drawSize, main.structureOptions, seedsCount, demand);
  const unfed = [...demand.entries()]
    .filter(([roundNumber]) => !rounds.some((round) => round.roundNumber === roundNumber))
    .map(([roundNumber, qualifiers]) => ({ roundNumber, capacity: 0, seeds: 0, qualifiers }));
  const short = [...rounds.filter(isShort), ...unfed];
  if (!short.length || unfed.length || short.length > 1) return { rounds, short };

  // the short round's size once more, after it: the profile the draw has, with that round stacked
  const target = short[0];
  const current = feedRoundsProfileOf(main.drawSize, main.structureOptions) ?? rounds.map((round) => round.capacity);
  const feedRoundsProfile = [...current, target.capacity].sort((a, b) => b - a);
  const drawSize = main.drawSize + target.capacity;
  const structureOptions = { ...main.structureOptions, feedRoundsProfile };
  if (!feedRoundsProfileOf(drawSize, structureOptions)) return { rounds, short };
  const proposed = lateRounds(drawSize, structureOptions, seedsCount, demand);
  if (proposed.some(isShort)) return { rounds, short };
  return { rounds, short, proposal: { drawSize, feedRoundsProfile } };
}

/** The card's line for a short round: `R3 needs 16 places, has 8 · 8 seeds, 8 qualifiers`. */
export function lateEntryText(round: LateEntryRound): string {
  const needed = round.seeds + round.qualifiers;
  const parts = [round.seeds && `${round.seeds} seeds`, round.qualifiers && `${round.qualifiers} qualifiers`];
  return `R${round.roundNumber} needs ${needed} places, has ${round.capacity} · ${parts.filter(Boolean).join(', ')}`;
}
