import { tournamentEngine } from 'tods-competition-factory';
import { renderSchematicRound } from './renderSchematicRound';
import type { SchematicMatchUp } from './renderSchematicMatchUp';

/**
 * Compact bracket renderer showing structure shape without participant details.
 * Uses the same getRoundMatchUps() engine call as renderStructure but produces
 * a much smaller visual (~14px per matchup vs ~60px).
 */
export function renderSchematicStructure({
  initialRoundNumber = 1,
  showHeaders = true,
  structureId,
  matchUps
}: {
  initialRoundNumber?: number;
  showHeaders?: boolean;
  structureId?: string;
  matchUps: SchematicMatchUp[];
}): HTMLElement {
  const { roundNumbers, roundProfile, roundsNotPowerOf2, hasNoRoundPositions } = tournamentEngine.getRoundMatchUps({
    matchUps
  });

  const isRoundRobin = matchUps.some((m) => m.isRoundRobin);
  const isLucky = roundsNotPowerOf2 || hasNoRoundPositions;
  const initialRoundFactor = initialRoundNumber > 1 ? roundProfile?.[initialRoundNumber]?.roundFactor || 1 : undefined;

  const div = document.createElement('div');
  div.className = 'chc-schematic-structure';
  if (structureId) div.setAttribute('id', `schematic-${structureId}`);

  const finalRoundNumber = roundNumbers.length ? Math.max(...roundNumbers) : 0;

  for (const roundNumber of roundNumbers) {
    if (roundNumber < initialRoundNumber) continue;
    const isFinalRound = roundNumber === finalRoundNumber;

    const round = renderSchematicRound({
      showHeader: showHeaders,
      initialRoundFactor,
      initialRoundNumber,
      isRoundRobin,
      isFinalRound,
      roundNumber,
      matchUps,
      isLucky
    });
    div.appendChild(round);
  }

  return div;
}
