import { mocksEngine, tournamentEngine, globalState } from 'tods-competition-factory';
import { DrawStateManager } from './drawStateManager';
import { describe, expect, it } from 'vitest';

function fixture() {
  const { tournamentRecord, drawIds } = mocksEngine.generateTournamentRecord({
    setState: true,
    nonRandom: 1,
    drawProfiles: [{ drawSize: 8, automated: false }],
    participantsProfile: { participantsCount: 16 }
  });
  const event = tournamentRecord.events![0];
  const draw = event.drawDefinitions![0];
  return { tournamentRecord, drawId: drawIds[0], eventId: event.eventId, structureId: draw.structures![0].structureId };
}

describe('DrawStateManager owned record', () => {
  it('keeps its record through assignments and removal without replacing the host engine state', () => {
    const params = fixture();
    const foreign = { tournamentId: 'host-tournament', tournamentName: 'Host state' };
    tournamentEngine.setState(foreign);
    const manager = new DrawStateManager(params);
    const participantId = manager.getAvailableParticipants()[0].participantId!;
    expect(manager.assignParticipant({ drawPosition: 1, participantId }).success).toBe(true);
    expect(manager.getState()?.tournamentId).toBe(params.tournamentRecord.tournamentId);
    expect(manager.removeAssignment({ drawPosition: 1 }).success).toBe(true);
    expect(manager.assignBye({ drawPosition: 1 }).success).toBe(true);
    expect(manager.getState()?.tournamentId).toBe(params.tournamentRecord.tournamentId);
    expect(tournamentEngine.getTournament().tournamentRecord?.tournamentId).toBe(foreign.tournamentId);
  });
  it('does not mark the host engine modified when a standalone example assigns a participant', () => {
    const params = fixture();
    const manager = new DrawStateManager(params);
    const participantId = manager.getAvailableParticipants()[0].participantId!;
    globalState.cycleMutationStatus();
    expect(manager.assignParticipant({ drawPosition: 1, participantId }).success).toBe(true);
    expect(globalState.cycleMutationStatus()).toBe(false);
  });
});
