import { depthLabel, parallelQualifying, qualifyingChains, qualifyingPaths } from '../domain/qualifyingPaths';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { topologyToDrawOptions } from '../domain/topologyToDrawOptions';
import { describe, expect, it } from 'vitest';

const PRE_QUALIFYING = 'Pre-qualifying';

const node = (id: string, stage: string, drawSize: number, qualifyingPositions?: number) => ({
  id,
  stage,
  structureName: id,
  structureType: 'SINGLE_ELIMINATION',
  drawSize,
  qualifyingPositions,
  position: { x: 0, y: 0 }
});
const winner = (sourceNodeId: string, targetNodeId: string, targetRoundNumber = 1) => ({
  id: `${sourceNodeId}-${targetNodeId}`,
  sourceNodeId,
  targetNodeId,
  linkType: 'WINNER',
  targetRoundNumber
});

/** MAIN 32; pre-qualifying 32 → qualifying 24 → MAIN R1; and a stronger qualifying 16 → MAIN R3 when asked. */
function topology({ stronger = false, parallel = false } = {}): any {
  const nodes: any[] = [node('Main', 'MAIN', 32), node('Pre', 'QUALIFYING', 32, 8), node('Q', 'QUALIFYING', 24, 8)];
  const edges: any[] = [winner('Pre', 'Q'), winner('Q', 'Main')];
  if (stronger) {
    nodes.push(node('Strong', 'QUALIFYING', 16, 8));
    edges.push(winner('Strong', 'Main', 3));
  }
  if (parallel) {
    nodes.push(node('Q2', 'QUALIFYING', 16, 4));
    edges.push(winner('Q2', 'Main'));
  }
  return { drawName: 'Paths', nodes, edges, selectedNodeId: null, selectedEdgeId: null };
}

describe('qualifying paths (CA, 2026-11-18)', () => {
  it('a card linked to a qualifying card is its pre-qualifying: sequence 1, the deepest', () => {
    const paths = qualifyingPaths(topology());
    expect(paths.get('Pre')).toEqual({ roundTarget: 1, entryStageSequence: 1, depth: 2, label: PRE_QUALIFYING });
    expect(paths.get('Q')).toEqual({ roundTarget: 1, entryStageSequence: 2, depth: 1, label: 'Qualifying' });
  });

  it("a stronger field's card linked to MAIN R3 targets R3, its own chain", () => {
    const paths = qualifyingPaths(topology({ stronger: true }));
    expect(paths.get('Strong')).toEqual({ roundTarget: 3, entryStageSequence: 1, depth: 1, label: 'Qualifying' });
    expect(qualifyingChains(topology({ stronger: true })).map(({ nodes }) => nodes.map((n) => n.id))).toEqual([
      ['Pre', 'Q'],
      ['Strong']
    ]);
  });

  it('labels by distance from MAIN', () => {
    expect([1, 2, 3].map(depthLabel)).toEqual(['Qualifying', PRE_QUALIFYING, 'Pre-pre-qualifying']);
  });

  it('a second chain into the same MAIN round is parallel; another round is not', () => {
    expect(parallelQualifying(topology({ stronger: true }))).toEqual([]);
    expect(parallelQualifying(topology({ parallel: true })).map((n) => n.id)).toEqual(['Q2']);
  });
});

describe('a chain generates as the factory chains qualifying', () => {
  it('pre-qualifying 32 → qualifying → MAIN: one profile, deepest first, every entrant placed', () => {
    const { drawOptions } = topologyToDrawOptions(topology());
    expect(drawOptions.qualifyingProfiles).toEqual([
      expect.objectContaining({
        roundTarget: 1,
        structureProfiles: [
          expect.objectContaining({ structureName: 'Pre', drawSize: 32, qualifyingPositions: 8 }),
          expect.objectContaining({ structureName: 'Q', drawSize: 24, qualifyingPositions: 8 })
        ]
      })
    ]);
    // MAIN takes the qualifiers that reach it, not the pre-qualifying's too
    expect(drawOptions.qualifiersCount).toEqual(8);

    // a pre-qualifying event (generated): 24 MAIN entries, 16 qualifying (sequence 2), 32 pre-qualifying (sequence 1)
    const { tournamentRecord } = mocksEngine.generateTournamentRecord({
      participantsProfile: { participantsCount: 72 }
    });
    tournamentEngine.setState(tournamentRecord);
    const ids = tournamentEngine.getParticipants().participants.map((p: any) => p.participantId);
    const { event } = tournamentEngine.addEvent({ event: { eventName: 'Chain' } });
    const eventId = event.eventId;
    tournamentEngine.addEventEntries({ eventId, participantIds: ids.slice(0, 24) });
    tournamentEngine.addEventEntries({
      eventId,
      participantIds: ids.slice(24, 40),
      entryStage: 'QUALIFYING',
      entryStageSequence: 2
    });
    tournamentEngine.addEventEntries({
      eventId,
      participantIds: ids.slice(40),
      entryStage: 'QUALIFYING',
      entryStageSequence: 1
    });

    const result = tournamentEngine.generateDrawDefinition({ ...drawOptions, eventId });
    expect(result.error).toBeUndefined();
    const qualifying = result.drawDefinition.structures.filter((s: any) => s.stage === 'QUALIFYING');
    const placed = (name: string) =>
      qualifying.find((s: any) => s.structureName === name).positionAssignments.filter((a: any) => a.participantId)
        .length;
    expect(placed('Pre')).toEqual(32);
    expect(placed('Q')).toEqual(16);
  });
});

describe('the QUALIFYING list cut into bands (CA, 2026-11-18)', () => {
  it('strongest first: the R3 chain, then the R1 qualifying, then its pre-qualifying; each its own entrants', async () => {
    const { qualifyingSlots } = await import('../domain/qualifyingPaths');
    const slots = qualifyingSlots(topology({ stronger: true }));
    expect(
      slots.map(({ structureName, entrants, path }) => [structureName, entrants, path.label, path.roundTarget])
    ).toEqual([
      ['Strong', 16, 'Qualifying', 3],
      // the qualifying 24 takes 8 from its pre-qualifying: 16 of its own
      ['Q', 16, 'Qualifying', 1],
      ['Pre', 32, PRE_QUALIFYING, 1]
    ]);
  });

  it('cuts the accepted list into the bands, in order; entries past the last band have none', async () => {
    const { assignQualifyingSlots, qualifyingSlots } = await import('../domain/qualifyingPaths');
    const ids = Array.from({ length: 70 }, (_, i) => `p${i + 1}`);
    const bands = assignQualifyingSlots(ids, qualifyingSlots(topology({ stronger: true })));
    expect(
      bands.map(({ slot, participantIds }) => [slot.structureName, participantIds.length, participantIds[0]])
    ).toEqual([
      ['Strong', 16, 'p1'],
      ['Q', 16, 'p17'],
      ['Pre', 32, 'p33']
    ]);
  });
});
