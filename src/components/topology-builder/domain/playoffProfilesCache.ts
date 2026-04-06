/**
 * Playoff Profiles Cache — Generates a temporary draw via mocksEngine
 * and calls getAvailablePlayoffProfiles() directly on the drawDefinition
 * to determine which rounds/positions are available for playoff links.
 *
 * Results are cached by drawType:drawSize:groupSize so the temporary
 * tournament is only generated once per unique configuration.
 */
import { mocksEngine, drawsGovernor, drawDefinitionConstants } from 'tods-competition-factory';

const { ROUND_ROBIN } = drawDefinitionConstants;

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

export function getPlayoffProfiles(structureType: string, drawSize: number, groupSize?: number): PlayoffProfiles {
  const key = `${structureType}:${drawSize}:${groupSize || ''}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const drawProfile: any = { drawSize, drawType: structureType };
    if (groupSize) {
      drawProfile.structureOptions = { groupSize };
    }

    const { tournamentRecord } = mocksEngine.generateTournamentRecord({
      drawProfiles: [drawProfile],
    });

    const drawDefinition = tournamentRecord?.events?.[0]?.drawDefinitions?.[0];
    if (!drawDefinition) return cacheAndReturn(key, {});

    const structures = drawDefinition.structures || [];
    const mainStructure = structures[0];
    if (!mainStructure) return cacheAndReturn(key, {});

    const isContainer = mainStructure.structureType === 'CONTAINER';

    let result: PlayoffProfiles = {};

    if (isContainer || structureType === ROUND_ROBIN) {
      const { availablePlayoffProfiles } = drawsGovernor.getAvailablePlayoffProfiles({ drawDefinition });
      const profile = availablePlayoffProfiles?.[0];
      if (profile) {
        result = {
          playoffFinishingPositionRanges: profile.playoffFinishingPositionRanges,
          finishingPositionsAvailable: profile.finishingPositionsAvailable,
        };
      }
    } else {
      const structureId = mainStructure.structureId;
      const { playoffRounds, playoffRoundsRanges } = drawsGovernor.getAvailablePlayoffProfiles({
        drawDefinition,
        structureId,
      });
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
