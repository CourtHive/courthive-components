import { mocksEngine, tournamentEngine, globalState } from 'tods-competition-factory';
import { DrawStateManager } from './drawStateManager';
import { describe, expect, it, vi } from 'vitest';

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
  it('reports pending and only renders and advances focus after one successful acknowledgement', () => {
    const params = fixture();
    let acknowledge: any;
    const manager = new DrawStateManager({
      ...params,
      adapter: {
        getTournamentRecord: () => params.tournamentRecord,
        mutate: (_method, _params, callback) => {
          acknowledge = callback;
        }
      }
    });
    const render = vi.fn();
    manager.setRenderCallback(render);
    expect(manager.assignParticipant({ drawPosition: 1, participantId: 'p1' })).toEqual({ pending: true });
    expect(render).not.toHaveBeenCalled();
    expect(manager.getAndClearFocusDrawPosition()).toBeUndefined();
    acknowledge({ success: true });
    expect(render).toHaveBeenCalledTimes(1);
    expect(manager.getAndClearFocusDrawPosition()).toBe(2);
    acknowledge({ success: true });
    expect(render).toHaveBeenCalledTimes(1);
    expect(manager.getAndClearFocusDrawPosition()).toBeUndefined();
  });
  it('does not render or advance on refusal, and returns copied state', () => {
    const params = fixture();
    const manager = new DrawStateManager({
      ...params,
      adapter: {
        getTournamentRecord: () => params.tournamentRecord,
        mutate: (_method, _params, callback) => callback({ error: 'refused' })
      }
    });
    const render = vi.fn();
    manager.setRenderCallback(render);
    expect(manager.assignParticipant({ drawPosition: 1, participantId: 'p1' })).toEqual({ error: 'refused' });
    expect(render).not.toHaveBeenCalled();
    expect(manager.getAndClearFocusDrawPosition()).toBeUndefined();
    const state = manager.getState()!;
    state.tournamentName = 'changed copy';
    expect(params.tournamentRecord.tournamentName).not.toBe('changed copy');
  });
});
