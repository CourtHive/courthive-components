/**
 * Journey mode's reading of a participant's matchUps: steps in play order, the links travelled, a nameless summary.
 */
import { journeyEdgeIds, journeyStepsFromMatchUps, journeySummary, stepsByNode } from '../domain/journey';
import { mocksEngine, tournamentEngine, tools } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

import type { TopologyState } from '../types';

const topology = (nodes: [string, string][], edges: [string, string, string, number?][]): TopologyState =>
  ({
    nodes: nodes.map(([id, structureName]) => ({ id, structureName })),
    edges: edges.map(([id, sourceNodeId, targetNodeId, sourceRoundNumber]) => ({
      id,
      sourceNodeId,
      targetNodeId,
      sourceRoundNumber
    })),
    selectedNodeId: null,
    selectedEdgeId: null,
    drawName: 'D'
  }) as unknown as TopologyState;

describe('journeyStepsFromMatchUps', () => {
  it('reads a completed feed-in championship: main, then consolation, each by round, with results', () => {
    const generated: any = mocksEngine.generateTournamentRecord({
      drawProfiles: [{ drawSize: 16, drawType: 'FEED_IN_CHAMPIONSHIP' }],
      completeAllMatchUps: true
    });
    tournamentEngine.setState(generated.tournamentRecord);
    const drawId = generated.drawIds[0];
    const dd = tournamentEngine.getEvent({ drawId }).drawDefinition;
    const order = dd.structures.toSorted((a: any, b: any) => tools.structureSort(a, b)).map((s: any) => s.structureId);
    const { matchUps } = tournamentEngine.allTournamentMatchUps({
      matchUpFilters: { drawIds: [drawId] },
      inContext: true
    });
    const ids = tournamentEngine.getParticipants().participants.map((p: any) => p.participantId);

    const crossing = ids
      .map((id: string) => journeyStepsFromMatchUps(matchUps, id, order))
      .find((steps) => new Set(steps.map((s) => s.structureId)).size > 1)!;
    const [mainId, consolationId] = order;
    const structures = crossing.map((s) => s.structureId);
    // main first, then consolation, never interleaved
    expect(structures.indexOf(consolationId)).toBeGreaterThan(structures.lastIndexOf(mainId));
    // the last main step is the loss that fed them across
    expect(crossing.filter((s) => s.structureId === mainId).at(-1)?.result).toBe('LOST');
    // rounds ascend within a structure
    const mainRounds = crossing.filter((s) => s.structureId === mainId).map((s) => s.roundNumber);
    expect(mainRounds).toEqual([...mainRounds].sort((a, b) => (a ?? 0) - (b ?? 0)));
  });

  it('a round robin group matchUp is a step of its container; a pair member is found in the pair', () => {
    const steps = journeyStepsFromMatchUps(
      [
        {
          matchUpId: 'm1',
          structureId: 'group-1',
          containerStructureId: 'rr',
          roundNumber: 1,
          winningSide: 2,
          sides: [
            { sideNumber: 1, participantId: 'x' },
            { sideNumber: 2, participant: { participantId: 'pair', individualParticipantIds: ['a', 'b'] } }
          ]
        },
        {
          matchUpId: 'm2',
          structureId: 'po',
          roundNumber: 1,
          matchUpStatus: 'BYE',
          sides: [{ sideNumber: 1, participantId: 'pair' }]
        }
      ],
      'a',
      ['rr', 'po']
    );
    expect(steps).toEqual([{ structureId: 'rr', roundNumber: 1, matchUpId: 'm1', result: 'WON' }]);
  });
});

describe('the links travelled, and the summary', () => {
  const state = topology(
    [
      ['main', 'Main'],
      ['cons', 'Consolation']
    ],
    [
      ['r1', 'main', 'cons', 1],
      ['r2', 'main', 'cons', 2]
    ]
  );
  const steps = [
    { structureId: 'main', roundNumber: 1, result: 'WON' as const },
    { structureId: 'main', roundNumber: 2, result: 'LOST' as const },
    { structureId: 'cons', roundNumber: 2, result: 'WON' as const },
    { structureId: 'cons', roundNumber: 3, result: 'PENDING' as const }
  ];

  it('picks the link out of the round they left from', () => {
    expect([...journeyEdgeIds(state, steps)]).toEqual(['r2']);
  });

  it('summarises by structure and round, never by name', () => {
    expect(journeySummary(state, steps)).toBe('Main R1 W · R2 L → Consolation R2 W · R3 …');
    expect(journeySummary(state, [])).toBe('No matchUps in this draw');
  });

  it('groups steps by node', () => {
    expect(
      stepsByNode(steps)
        .get('cons')
        ?.map((s) => s.roundNumber)
    ).toEqual([2, 3]);
  });
});
