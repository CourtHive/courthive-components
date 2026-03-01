/**
 * Playoff Profiles Cache — Generates a temporary draw via mocksEngine
 * and calls tournamentEngine.getAvailablePlayoffProfiles() to determine
 * which rounds/positions are available for playoff links.
 *
 * Results are cached by drawType:drawSize:groupSize so the temporary
 * tournament is only generated once per unique configuration.
 */
import { mocksEngine, tournamentEngine, drawDefinitionConstants } from 'tods-competition-factory';

const { ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF } = drawDefinitionConstants;
const RR_TYPES = new Set([ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF]);

export interface PlayoffRoundRange {
  roundNumber: number;
  finishingPositionRange: string;
}

export interface PlayoffFinishingPositionRange {
  finishingPosition: number;
  finishingPositionRange: string;
}

export interface PlayoffProfiles {
  playoffRounds?: number[];
  playoffRoundsRanges?: PlayoffRoundRange[];
  playoffFinishingPositionRanges?: PlayoffFinishingPositionRange[];
  finishingPositionsAvailable?: number[];
}

const cache = new Map<string, PlayoffProfiles>();

export function getPlayoffProfiles(
  drawType: string,
  drawSize: number,
  groupSize?: number,
): PlayoffProfiles {
  const key = `${drawType}:${drawSize}:${groupSize || ''}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const drawProfile: any = { drawSize, drawType };
    if (groupSize) {
      drawProfile.structureOptions = { groupSize };
    }

    const { tournamentRecord } = mocksEngine.generateTournamentRecord({
      drawProfiles: [drawProfile],
    });

    tournamentEngine.setState(tournamentRecord);

    // Extract drawId and structure info from the generated record
    const drawDefinition = tournamentRecord?.events?.[0]?.drawDefinitions?.[0];
    if (!drawDefinition) return cacheAndReturn(key, {});

    const drawId = drawDefinition.drawId;
    const structures = drawDefinition.structures || [];
    const mainStructure = structures[0];
    if (!mainStructure) return cacheAndReturn(key, {});

    const isContainer = mainStructure.structureType === 'CONTAINER';

    let result: PlayoffProfiles = {};

    if (isContainer || RR_TYPES.has(drawType)) {
      // RR / container: call without structureId
      const { availablePlayoffProfiles } =
        tournamentEngine.getAvailablePlayoffProfiles({ drawId });
      const profile = availablePlayoffProfiles?.[0];
      if (profile) {
        result = {
          playoffFinishingPositionRanges: profile.playoffFinishingPositionRanges,
          finishingPositionsAvailable: profile.finishingPositionsAvailable,
        };
      }
    } else {
      // SE / elimination: call with structureId
      const structureId = mainStructure.structureId;
      const { playoffRounds, playoffRoundsRanges } =
        tournamentEngine.getAvailablePlayoffProfiles({ drawId, structureId });
      result = { playoffRounds, playoffRoundsRanges };
    }

    return cacheAndReturn(key, result);
  } catch {
    return cacheAndReturn(key, {});
  }
}

function cacheAndReturn(key: string, value: PlayoffProfiles): PlayoffProfiles {
  cache.set(key, value);
  return value;
}

export function clearPlayoffProfilesCache(): void {
  cache.clear();
}
