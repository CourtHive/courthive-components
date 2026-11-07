/**
 * A completed draw behind a read-only topology, for the Player journey stories — the shape TMX's inline topology has.
 *
 * A 16 feed-in championship, every matchUp completed: a main-draw loser is fed into the consolation, so most
 * participants' journeys cross structures. Steps come from the draw's own matchUps (`journeyStepsFromMatchUps`), in
 * the structures' play order (`tools.structureSort`). The search is the one place a name appears.
 */
import { TopologyBuilderControl } from '../../components/topology-builder/controller/topologyBuilderControl';
import { journeyStepsFromMatchUps } from '../../components/topology-builder/domain/journey';
import { mocksEngine, tournamentEngine, tools } from 'tods-competition-factory';
import { hydrate } from './liveTopologyHost';

import type { JourneyStep, TopologyState } from '../../components/topology-builder/types';

export type JourneyTopologyHost = {
  element: HTMLElement;
  control: TopologyBuilderControl;
  /** A participant whose journey crosses into the consolation, and their name (for the search). */
  traveller: { participantId: string; name: string };
  stepped: JourneyStep[];
};

export function journeyTopologyHost({ height = '100vh' }: { height?: string } = {}): JourneyTopologyHost {
  const generated: any = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 16, drawType: 'FEED_IN_CHAMPIONSHIP' }],
    completeAllMatchUps: true,
    randomWinningSide: false
  });
  tournamentEngine.setState(generated.tournamentRecord);
  const drawId: string = generated.drawIds[0];
  const drawDefinition = tournamentEngine.getEvent({ drawId }).drawDefinition;
  const structureOrder = drawDefinition.structures
    .toSorted((a: any, b: any) => tools.structureSort(a, b))
    .map((s: any) => s.structureId);
  const { matchUps } = tournamentEngine.allTournamentMatchUps({
    matchUpFilters: { drawIds: [drawId] },
    inContext: true
  });
  const { participants } = tournamentEngine.getParticipants();
  const stepsFor = (participantId: string) => journeyStepsFromMatchUps(matchUps, participantId, structureOrder);

  const travellerId = participants
    .map((p: any) => p.participantId)
    .find((id: string) => new Set(stepsFor(id).map((s) => s.structureId)).size > 1);
  const traveller = {
    participantId: travellerId,
    name: participants.find((p: any) => p.participantId === travellerId).participantName
  };

  const stepped: JourneyStep[] = [];
  const element = document.createElement('div');
  element.style.height = height;
  const control = new TopologyBuilderControl({
    initialState: hydrate(drawDefinition) as Partial<TopologyState>,
    hideTemplates: true,
    readOnly: true,
    footer: true,
    journey: {
      search: (query) =>
        participants
          .filter((p: any) => p.participantName?.toLowerCase().includes(query.toLowerCase()))
          .map((p: any) => ({ participantId: p.participantId, name: p.participantName })),
      stepsFor,
      onStep: (step) => stepped.push(step)
    }
  });
  control.render(element);
  control.autoLayout();
  return { element, control, traveller, stepped };
}
