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

import type { TopologyState } from '../../components/topology-builder/types';

export type FitTopologyHost = { element: HTMLElement; control: TopologyBuilderControl; fitCalls: () => number };

/** 24 DA, 4 WC, 6 ALT and 2 WD in MAIN, 12 in QUALIFYING: the mixed event measured on 2026-11-08. */
export function fitTopologyHost({
  mode,
  height = '100vh'
}: { mode?: 'view' | 'fit'; height?: string } = {}): FitTopologyHost {
  const generated: any = mocksEngine.generateTournamentRecord({
    participantsProfile: { participantsCount: 48 },
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
    drawFit: (state) => {
      calls += 1;
      const { drawOptions } = topologyToDrawOptions(state);
      return (tournamentEngine as any).getDrawFit({ ...drawOptions, eventId });
    }
  });
  control.render(element);
  control.autoLayout();
  return { element, control, fitCalls: () => calls };
}
