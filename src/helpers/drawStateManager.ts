/** Draw assignment UI state. Hosts own the record and mutation authority through an adapter. */
import { drawsGovernor, queryGovernor, globalState, tools } from 'tods-competition-factory';
import type { Tournament } from 'tods-competition-factory';
import type { Participant } from '../types';

export type RenderCallback = () => void;
export type DrawAssignmentMethod = 'assignDrawPosition' | 'assignDrawPositionBye' | 'removeDrawPositionAssignment';
export interface DrawAssignmentParams {
  drawId: string;
  structureId: string;
  drawPosition: number;
  participantId?: string;
  qualifier?: boolean;
}
export interface DrawAssignmentResult {
  success?: boolean;
  error?: unknown;
  /** The host accepted an asynchronous request; no assignment has been acknowledged yet. */
  pending?: boolean;
}
export interface DrawStateAdapter {
  /** Query current state on every use; never reinstall an opening snapshot. */
  getTournamentRecord: () => Tournament | undefined;
  /** Apply once, then acknowledge. Only a successful acknowledgement changes focus/renders. */
  mutate: (
    method: DrawAssignmentMethod,
    params: DrawAssignmentParams,
    callback: (result: DrawAssignmentResult) => void
  ) => void;
}

/** Standalone examples own a private record and call stateless governors, never the singleton engine. */
function localAdapter(record: Tournament): DrawStateAdapter {
  const tournamentRecord = tools.makeDeepCopy(record);
  return {
    getTournamentRecord: () => tournamentRecord,
    mutate: (method, params, callback) => {
      const event = tournamentRecord.events?.find((item) =>
        item.drawDefinitions?.some((draw) => draw.drawId === params.drawId)
      );
      const drawDefinition = event?.drawDefinitions?.find((draw) => draw.drawId === params.drawId);
      const args = { ...params, tournamentRecord, drawDefinition, event };
      // Governors also buffer notices and mutation flags through the state provider. Scope those
      // synchronous side effects to the private record, and restore the host before acknowledging.
      const host = globalState.getProvider();
      const unsupported = () => {
        throw new Error('Standalone assignment cannot replace tournament state');
      };
      const ignore = () => {};
      const records = { [tournamentRecord.tournamentId]: tournamentRecord };
      globalState.setStateProvider({
        ...host,
        addNotice: ignore,
        callListener: ignore,
        deleteNotice: ignore,
        deleteNotices: ignore,
        disableNotifications: ignore,
        enableNotifications: ignore,
        setSubscriptions: unsupported,
        cycleMutationStatus: () => false,
        getTopics: () => ({ topics: [] }),
        getNotices: () => [],
        getPayloads: () => [],
        getNoticeBuffer: () => [],
        setNoticeBuffer: ignore,
        getTournamentId: () => tournamentRecord.tournamentId,
        getTournamentRecord: (id: string) => records[id],
        getTournamentRecords: () => records,
        setTournamentId: unsupported,
        setTournamentRecord: unsupported,
        setTournamentRecords: unsupported,
        removeTournamentRecord: unsupported
      });
      let result: DrawAssignmentResult;
      try {
        result =
          method === 'removeDrawPositionAssignment'
            ? drawsGovernor.removeDrawPositionAssignment(args)
            : drawsGovernor.assignDrawPosition({ ...args, bye: method === 'assignDrawPositionBye' });
      } finally {
        globalState.setStateProvider(host);
      }
      callback(result);
    }
  };
}

export class DrawStateManager {
  private readonly adapter: DrawStateAdapter;
  private readonly drawId: string;
  private readonly structureId: string;
  private readonly eventId?: string;
  private renderCallback?: RenderCallback;
  private focusDrawPosition?: number;

  constructor({
    tournamentRecord,
    adapter,
    drawId,
    structureId,
    eventId
  }: {
    tournamentRecord?: Tournament;
    adapter?: DrawStateAdapter;
    drawId: string;
    structureId: string;
    eventId?: string;
  }) {
    if (!adapter && !tournamentRecord) throw new Error('DrawStateManager requires a record or adapter');
    this.adapter = adapter ?? localAdapter(tournamentRecord!);
    this.drawId = drawId;
    this.structureId = structureId;
    this.eventId = eventId;
  }

  setRenderCallback(callback: RenderCallback): void {
    this.renderCallback = callback;
  }

  private context() {
    const tournamentRecord = this.adapter.getTournamentRecord();
    const event = tournamentRecord?.events?.find((item) =>
      this.eventId ? item.eventId === this.eventId : item.drawDefinitions?.some((draw) => draw.drawId === this.drawId)
    );
    const drawDefinition = event?.drawDefinitions?.find((draw) => draw.drawId === this.drawId);
    return { tournamentRecord, drawDefinition, event };
  }

  getAllParticipants(): Participant[] {
    const { tournamentRecord, drawDefinition, event } = this.context();
    if (!tournamentRecord || !event || !drawDefinition) return [];
    const { flightProfile } = queryGovernor.getFlightProfile({ event });
    const flight = flightProfile?.flights?.find((item) => item.drawId === this.drawId);
    const entries = flight?.drawEntries ?? drawDefinition.entries ?? [];
    const participantIds = entries.map((entry) => entry.participantId).filter((id): id is string => !!id);
    if (!participantIds.length) return [];
    const { participants = [] } = queryGovernor.getParticipants({
      tournamentRecord,
      participantFilters: { participantIds }
    });
    return participants as Participant[];
  }

  getAvailableParticipants(): Participant[] {
    const { drawDefinition } = this.context();
    if (!drawDefinition) return [];
    const { assignedParticipantIds = [] } = queryGovernor.getAssignedParticipantIds({ drawDefinition });
    const assigned = new Set(assignedParticipantIds);
    return this.getAllParticipants().filter((participant) => !assigned.has(participant.participantId!));
  }

  /** A request is pending until the host acknowledges it. Refusals do not advance focus or render. */
  private request(
    method: DrawAssignmentMethod,
    params: { drawPosition: number; participantId?: string; qualifier?: boolean },
    render = true
  ): DrawAssignmentResult {
    let completed: DrawAssignmentResult | undefined;
    let acknowledged = false;
    this.adapter.mutate(method, { ...params, drawId: this.drawId, structureId: this.structureId }, (result) => {
      if (acknowledged) return;
      acknowledged = true;
      completed = result;
      if (!result.success || result.error) return;
      if (method !== 'removeDrawPositionAssignment') this.focusDrawPosition = params.drawPosition + 1;
      if (render) this.renderCallback?.();
    });
    return completed ?? { pending: true };
  }

  /** Factory validation controls replacement, including assignments with recorded scores. */
  assignParticipant(params: { drawPosition: number; participantId: string }): DrawAssignmentResult {
    return this.request('assignDrawPosition', params);
  }

  assignBye(params: { drawPosition: number }): DrawAssignmentResult {
    return this.request('assignDrawPositionBye', params);
  }

  assignQualifier(params: { drawPosition: number }): DrawAssignmentResult {
    return this.request('assignDrawPosition', { ...params, qualifier: true });
  }

  removeAssignment(params: { drawPosition: number }): DrawAssignmentResult {
    const hadBye = this.getMatchUps().some((matchUp) =>
      matchUp.sides?.some((side: any) => side.drawPosition === params.drawPosition && side.bye)
    );
    return this.request('removeDrawPositionAssignment', params, hadBye);
  }

  getAndClearFocusDrawPosition(): number | undefined {
    const position = this.focusDrawPosition;
    this.focusDrawPosition = undefined;
    return position;
  }

  getMatchUps(): any[] {
    const { tournamentRecord, event } = this.context();
    if (!tournamentRecord || !event) return [];
    const { eventData } = queryGovernor.getEventData({ tournamentRecord, event });
    const draw = eventData?.drawsData?.find((item: any) => item.drawId === this.drawId);
    const structure = draw?.structures?.find((item: any) => item.structureId === this.structureId);
    return structure?.roundMatchUps ? Object.values(structure.roundMatchUps).flat() : [];
  }

  /** A copy of the current record. Asynchronous hosts are queried at call time. */
  getState(): Tournament | undefined {
    const record = this.adapter.getTournamentRecord();
    return record && tools.makeDeepCopy(record);
  }

  getContext(): { drawId: string; structureId: string } {
    return { drawId: this.drawId, structureId: this.structureId };
  }
}
