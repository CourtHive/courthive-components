/**
 * An event full of entries behind an editable topology, for the Fit mode stories — the shape TMX's topology page has.
 *
 * The fit is the factory's: `topologyToDrawOptions` makes the draw the topology describes and `getDrawFit` runs the
 * generator on it without attaching anything. `fitCalls` counts how often the factory was asked, so a test can show
 * that dragging a card does not regenerate the draw.
 */
import { TopologyBuilderControl } from '../../components/topology-builder/controller/topologyBuilderControl';
import { topologyToDrawOptions } from '../../components/topology-builder/domain/topologyToDrawOptions';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';

import type { AcceptanceEntry, EntryChange, TopologyState } from '../../components/topology-builder/types';

export type FitTopologyHost = {
  element: HTMLElement;
  control: TopologyBuilderControl;
  fitCalls: () => number;
  /** The entry changes the acceptance line last reported, as a host would apply them */
  lastEntryChanges: () => EntryChange[];
};

/** A rating as a number: mocks write a plain number or an accessor object. */
const ratingValue = (value: unknown): number => {
  if (typeof value === 'number') return value;
  const first = value && typeof value === 'object' ? Object.values(value)[0] : value;
  return Number(first) || 0;
};

/** 24 DA, 4 WC, 6 ALT and 2 WD in MAIN, 12 in QUALIFYING: the mixed event measured on 2026-11-08. */
export function fitTopologyHost({
  mode,
  height = '100vh'
}: { mode?: 'view' | 'fit'; height?: string } = {}): FitTopologyHost {
  const generated: any = mocksEngine.generateTournamentRecord({
    participantsProfile: { participantsCount: 48, scaleAllParticipants: true, category: { ratingType: 'ELO' } },
    eventProfiles: [{ eventName: 'Open Singles' }]
  });
  tournamentEngine.setState(generated.tournamentRecord);
  const eventId: string = generated.eventIds[0];
  const ids = tournamentEngine.getParticipants().participants.map((p: any) => p.participantId);
  const add = (from: number, to: number, extra: Record<string, string> = {}) =>
    tournamentEngine.addEventEntries({ eventId, participantIds: ids.slice(from, to), ...extra });
  add(0, 24);
  add(24, 28, { entryStatus: 'WILDCARD' });
  add(28, 34, { entryStatus: 'ALTERNATE' });
  add(34, 46, { entryStage: 'QUALIFYING' });
  add(46, 48, { entryStatus: 'WITHDRAWN' });

  let calls = 0;
  let entryChanges: EntryChange[] = [];

  // the MAIN entries, best ELO first, as TMX would rank them for the acceptance line
  const acceptanceEntries = (): AcceptanceEntry[] => {
    const { event } = tournamentEngine.getEvent({ eventId });
    const { participants } = tournamentEngine.getParticipants({ withScaleValues: true });
    const byId = new Map(participants.map((p: any) => [p.participantId, p]));
    return (event.entries ?? [])
      .filter((entry: any) => (entry.entryStage ?? 'MAIN') === 'MAIN')
      .map((entry: any) => {
        const participant: any = byId.get(entry.participantId);
        const elo = ratingValue(participant?.ratings?.SINGLES?.find((r: any) => r.scaleName === 'ELO')?.scaleValue);
        return { entry, participant, elo };
      })
      .sort((a: any, b: any) => b.elo - a.elo)
      .map(({ entry, participant, elo }: any) => ({
        participantId: entry.participantId,
        name: participant?.participantName ?? entry.participantId,
        entryStatus: entry.entryStatus,
        rankLabel: elo ? `ELO ${Math.round(elo)}` : undefined
      }));
  };

  // the event's entries with the acceptance line's changes, for the trial fit; the event itself is never changed
  const trialEntries = (changes: EntryChange[]) => {
    const to = new Map(changes.map(({ participantId, to }) => [participantId, to]));
    const { event } = tournamentEngine.getEvent({ eventId });
    return (event.entries ?? []).map((entry: any) =>
      to.has(entry.participantId) ? { ...entry, entryStatus: to.get(entry.participantId) } : entry
    );
  };
  const initialState: Partial<TopologyState> = {
    drawName: 'Open Singles',
    nodes: [
      {
        id: 'qual',
        structureName: 'Qualifying',
        stage: 'QUALIFYING',
        structureType: 'SINGLE_ELIMINATION',
        drawSize: 16,
        qualifyingPositions: 4,
        position: { x: 0, y: 0 }
      },
      {
        id: 'main',
        structureName: 'Main',
        stage: 'MAIN',
        structureType: 'SINGLE_ELIMINATION',
        drawSize: 32,
        position: { x: 0, y: 0 }
      }
    ],
    edges: [
      {
        id: 'q-m',
        sourceNodeId: 'qual',
        targetNodeId: 'main',
        linkType: 'WINNER',
        targetRoundNumber: 1,
        label: 'qualifiers'
      }
    ],
    selectedNodeId: null,
    selectedEdgeId: null
  };

  const element = document.createElement('div');
  element.style.height = height;
  const control = new TopologyBuilderControl({
    initialState,
    hideTemplates: true,
    hideGenerate: true,
    footer: true,
    mode,
    drawFit: (state, trial) => {
      calls += 1;
      const { drawOptions } = topologyToDrawOptions(state);
      return (tournamentEngine as any).getDrawFit({
        ...drawOptions,
        ...(trial && { drawEntries: trialEntries(trial.entryChanges) }),
        eventId
      });
    },
    acceptance: { entries: acceptanceEntries },
    onEntryChanges: (changes) => (entryChanges = changes)
  });
  control.render(element);
  control.autoLayout();
  return { element, control, fitCalls: () => calls, lastEntryChanges: () => entryChanges };
}
