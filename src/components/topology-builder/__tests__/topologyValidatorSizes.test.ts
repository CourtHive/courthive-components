import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { topologyToDrawOptions } from '../domain/topologyToDrawOptions';
import { validateTopology } from '../domain/topologyValidator';
import { standardTemplates } from '../domain/templates';
import { describe, expect, it } from 'vitest';

const at = { x: 0, y: 0 };
/** A qualifying elimination of `size` sending 8 to a MAIN of `mainSize`. */
function topology(size: number, mainSize = 32): any {
  return {
    drawName: 'Sizes',
    selectedNodeId: null,
    selectedEdgeId: null,
    nodes: [
      {
        id: 'q',
        structureName: 'Qualifying',
        stage: 'QUALIFYING',
        structureType: 'SINGLE_ELIMINATION',
        drawSize: size,
        qualifyingPositions: 8,
        position: at
      },
      {
        id: 'm',
        structureName: 'Main',
        stage: 'MAIN',
        structureType: 'SINGLE_ELIMINATION',
        drawSize: mainSize,
        position: at
      }
    ],
    edges: [
      {
        id: 'q-m',
        sourceNodeId: 'q',
        targetNodeId: 'm',
        linkType: 'WINNER',
        targetRoundNumber: 1,
        qualifyingPositions: 8
      }
    ]
  };
}

const sizeErrors = (state: any) => validateTopology(state).filter(({ message }) => message.includes('power of 2'));

describe('a qualifying elimination is any size (CA, 2026-11-18)', () => {
  it('a qualifying 40 for 8 is no error: the factory plays it at 64, rounds 32, 16, 8, with 24 BYEs', () => {
    expect(sizeErrors(topology(40))).toEqual([]);
    expect(validateTopology(topology(40)).filter(({ severity }) => severity === 'error')).toEqual([]);
  });

  it('any qualifying size from 2 up, as qualifierCounts offers it', () => {
    for (const size of [9, 12, 18, 24, 36, 40, 48, 72]) expect(sizeErrors(topology(size))).toEqual([]);
  });

  it('the factory generates it: 24 direct entries and 40 qualifying (generated)', () => {
    const generated: any = mocksEngine.generateTournamentRecord({
      participantsProfile: { participantsCount: 64 },
      eventProfiles: [{ eventName: 'Sizes', participantsProfile: { participantsCount: 0 } }]
    });
    tournamentEngine.setState(generated.tournamentRecord);
    const eventId = generated.eventIds[0];
    const ids = tournamentEngine.getParticipants().participants.map((p: any) => p.participantId);
    tournamentEngine.addEventEntries({ eventId, participantIds: ids.slice(0, 24) });
    tournamentEngine.addEventEntries({ eventId, participantIds: ids.slice(24), entryStage: 'QUALIFYING' });

    const { drawOptions } = topologyToDrawOptions(topology(40));
    const result: any = tournamentEngine.generateDrawDefinition({ ...drawOptions, eventId });
    expect(result.error).toBeUndefined();
    const qualifying = result.drawDefinition.structures.find((s: any) => s.stage === 'QUALIFYING');
    // 8 is not a halving of 40, so the draw is the smallest 8 × 2ⁿ that holds 40: 64, every entrant placed
    expect(qualifying.positionAssignments).toHaveLength(64);
    expect(qualifying.positionAssignments.filter((a: any) => a.participantId)).toHaveLength(40);
    expect(qualifying.positionAssignments.filter((a: any) => a.bye)).toHaveLength(24);
  });

  it('a single elimination MAIN is a power of 2, whatever links into it; a Feed-in MAIN is any size', () => {
    // linked from qualifying, a 36 was let through and generated as a Feed-in nobody chose (CA, 2026-11-18)
    expect(sizeErrors(topology(40, 36)).map(({ nodeId }) => nodeId)).toEqual(['m']);
    expect(validateTopology(topology(40, 36)).find(({ nodeId }) => nodeId === 'm')?.message).toBe(
      '"Main" is a single elimination of 36: choose a power of 2, or Feed-in for a draw of 36'
    );
    const feedIn = topology(40, 36);
    feedIn.nodes[1].structureType = 'FEED_IN';
    expect(validateTopology(feedIn).filter(({ nodeId }) => nodeId === 'm')).toEqual([]);
    expect(sizeErrors(topology(40, 32))).toEqual([]);
  });
});

describe('every built-in template can be generated', () => {
  for (const template of standardTemplates) {
    it(template.name, () => {
      const state: any = { ...template.state, selectedNodeId: null, selectedEdgeId: null };
      expect(validateTopology(state).filter(({ severity }) => severity === 'error')).toEqual([]);
    });
  }
});
