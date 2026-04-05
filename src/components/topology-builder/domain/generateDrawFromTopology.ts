/**
 * Generate Draw from Topology — Runs the full factory generation pipeline
 * from a TopologyState, returning structured results for testing and UI display.
 */
import { mocksEngine, tournamentEngine, drawDefinitionConstants } from 'tods-competition-factory';
import { topologyToDrawOptions } from './topologyToDrawOptions';
import type { TopologyState } from '../types';

const { MAIN } = drawDefinitionConstants;

export interface StructureInfo {
  structureName: string;
  stage: string;
  stageSequence: number;
  matchUpCount: number;
  positionCount: number;
}

export interface GenerationResult {
  success: boolean;
  drawOptions?: any;
  structures?: StructureInfo[];
  linkCount?: number;
  error?: string;
}

export function generateDrawFromTopology(state: TopologyState, participantsCount?: number): GenerationResult {
  let drawOptions: any;
  let postGenerationMethods: any[];

  try {
    const result = topologyToDrawOptions(state);
    drawOptions = result.drawOptions;
    postGenerationMethods = result.postGenerationMethods;
  } catch (err: any) {
    return { success: false, error: `Conversion error: ${err.message}` };
  }

  const effectiveParticipantsCount = participantsCount ?? drawOptions.drawSize;

  try {
    // Generate a tournament with participants
    const { tournamentRecord } = mocksEngine.generateTournamentRecord({
      participantsProfile: { participantsCount: effectiveParticipantsCount }
    });

    tournamentEngine.setState(tournamentRecord);

    // Create event and add entries
    const { event } = tournamentEngine.addEvent({
      event: { eventName: state.drawName || 'Generated Draw' }
    });
    const eventId = event.eventId;

    const { participants } = tournamentEngine.getParticipants();
    const participantIds = participants.slice(0, effectiveParticipantsCount).map((p: any) => p.participantId);
    tournamentEngine.addEventEntries({ eventId, participantIds });

    // Generate draw definition
    const genResult = tournamentEngine.generateDrawDefinition({
      eventId,
      ...drawOptions
    });

    if (genResult.error) {
      return { success: false, drawOptions, error: `generateDrawDefinition error: ${JSON.stringify(genResult.error)}` };
    }

    const { drawDefinition } = genResult;
    tournamentEngine.addDrawDefinition({ eventId, drawDefinition });

    // Execute post-generation methods (e.g. addPlayoffStructures)
    for (const pgm of postGenerationMethods) {
      const drawId = drawDefinition.drawId;
      if (pgm.method === 'addPlayoffStructures') {
        tournamentEngine.addPlayoffStructures({ drawId, ...pgm.params });
      }
    }

    // Re-fetch draw to include any structures added by post-generation
    const { drawDefinition: finalDraw } = tournamentEngine.getEvent({ drawId: drawDefinition.drawId });

    const structures: StructureInfo[] = (finalDraw.structures || []).map((s: any) => ({
      structureName: s.structureName || '',
      stage: s.stage || MAIN,
      stageSequence: s.stageSequence || 1,
      matchUpCount: (s.matchUps || []).length,
      positionCount: s.positionAssignments?.length || s.drawSize || 0
    }));

    const linkCount = (finalDraw.links || []).length;

    return { success: true, drawOptions, structures, linkCount };
  } catch (err: any) {
    return { success: false, drawOptions, error: `Factory error: ${err.message}` };
  }
}
