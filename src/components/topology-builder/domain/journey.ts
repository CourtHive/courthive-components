/**
 * Journey mode's reading of a participant's steps: which rounds of which card to light, which links they travelled,
 * and the footer's one-line summary. Pure; never a name.
 */
import type { JourneyStep, TopologyState } from '../types';

/** Each node's steps, keyed by node id. */
export function stepsByNode(steps: JourneyStep[]): Map<string, JourneyStep[]> {
  const byNode = new Map<string, JourneyStep[]>();
  for (const step of steps) byNode.set(step.structureId, [...(byNode.get(step.structureId) ?? []), step]);
  return byNode;
}

/**
 * The links the participant travelled: between consecutive steps in different structures, the edge from the first
 * to the second. Several edges can join two structures (a loser link per round); the one leaving the round the
 * participant left from is preferred when the edge names its source round.
 */
export function journeyEdgeIds(state: TopologyState, steps: JourneyStep[]): Set<string> {
  const edges = new Set<string>();
  for (let index = 1; index < steps.length; index += 1) {
    const from = steps[index - 1];
    const to = steps[index];
    if (from.structureId === to.structureId) continue;
    const joining = state.edges.filter((e) => e.sourceNodeId === from.structureId && e.targetNodeId === to.structureId);
    const byRound = joining.find((e) => e.sourceRoundNumber !== undefined && e.sourceRoundNumber === from.roundNumber);
    const edge = byRound ?? joining[0];
    if (edge) edges.add(edge.id);
  }
  return edges;
}

const RESULT_MARK: Record<NonNullable<JourneyStep['result']>, string> = {
  WON: 'W',
  LOST: 'L',
  BYE: 'BYE',
  PENDING: '\u2026'
};

/** `Main R1 W · R2 L → Consolation R1 W · R2 …` — structures by name, rounds by number, never the participant. */
export function journeySummary(state: TopologyState, steps: JourneyStep[]): string {
  if (!steps.length) return 'No matchUps in this draw';
  const nameOf = (id: string) => state.nodes.find((n) => n.id === id)?.structureName ?? 'Structure';
  const legs: string[] = [];
  let current: { structureId: string; rounds: string[] } | undefined;
  for (const step of steps) {
    const round = `R${step.roundNumber ?? '?'} ${RESULT_MARK[step.result ?? 'PENDING']}`;
    if (current?.structureId === step.structureId) current.rounds.push(round);
    else {
      if (current) legs.push(`${nameOf(current.structureId)} ${current.rounds.join(' · ')}`);
      current = { structureId: step.structureId, rounds: [round] };
    }
  }
  if (current) legs.push(`${nameOf(current.structureId)} ${current.rounds.join(' · ')}`);
  return legs.join(' \u2192 ');
}

/** The fields a journey reads off a matchUp in context. */
export interface JourneyMatchUp {
  matchUpId: string;
  structureId?: string;
  containerStructureId?: string;
  roundNumber?: number;
  matchUpStatus?: string;
  winningSide?: number;
  sides?: {
    sideNumber?: number;
    participantId?: string;
    participant?: { participantId?: string; individualParticipantIds?: string[] };
  }[];
}

/** The participant's side of a matchUp, as a pair's member too. */
function sideOf(matchUp: JourneyMatchUp, participantId: string) {
  return matchUp.sides?.find(
    (side) =>
      (side.participantId ?? side.participant?.participantId) === participantId ||
      !!side.participant?.individualParticipantIds?.includes(participantId)
  );
}

/**
 * A participant's journey from a draw's matchUps (in context): one step per matchUp they are in, in the structures'
 * play order (`structureOrder`, the draw's structure ids as `tools.structureSort` orders them) and then by round. A
 * round robin group's matchUp is a step of its container — the node the topology draws.
 */
export function journeyStepsFromMatchUps(
  matchUps: JourneyMatchUp[],
  participantId: string,
  structureOrder: string[] = []
): JourneyStep[] {
  const orderOf = (structureId: string) => {
    const index = structureOrder.indexOf(structureId);
    return index < 0 ? Number.POSITIVE_INFINITY : index;
  };
  return matchUps
    .map((matchUp) => ({ matchUp, side: sideOf(matchUp, participantId) }))
    .filter(({ side }) => !!side)
    .map(({ matchUp, side }) => {
      const structureId = (matchUp.containerStructureId ?? matchUp.structureId) as string;
      let result: JourneyStep['result'] = 'PENDING';
      if (matchUp.matchUpStatus === 'BYE') result = 'BYE';
      else if (matchUp.winningSide) result = matchUp.winningSide === side!.sideNumber ? 'WON' : 'LOST';
      return { structureId, roundNumber: matchUp.roundNumber, matchUpId: matchUp.matchUpId, result };
    })
    .sort((a, b) => orderOf(a.structureId) - orderOf(b.structureId) || (a.roundNumber ?? 0) - (b.roundNumber ?? 0));
}
