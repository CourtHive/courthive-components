import { tournamentEngine } from 'tods-competition-factory';
import { renderSchematicRound } from './renderSchematicRound';

// constants and types
import type { SchematicMatchUp, SchematicOptions } from './renderSchematicMatchUp';

/**
 * Compact bracket renderer showing structure shape without participant details.
 * Uses the same getRoundMatchUps() engine call as renderStructure but produces
 * a much smaller visual (~14px per matchup vs ~60px).
 */
export function renderSchematicStructure({
  initialRoundNumber = 1,
  showHeaders = true,
  structureId,
  matchUps,
  options
}: {
  initialRoundNumber?: number;
  showHeaders?: boolean;
  structureId?: string;
  matchUps: SchematicMatchUp[];
  /** geometry and colours; defaults reproduce the original rendering */
  options?: SchematicOptions;
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
  applySchematicOptions(div, options);

  const finalRoundNumber = roundNumbers.length ? Math.max(...roundNumbers) : 0;

  for (const roundNumber of roundNumbers) {
    if (roundNumber < initialRoundNumber) continue;
    const isFinalRound = roundNumber === finalRoundNumber;

    const round = renderSchematicRound({
      showHeader: showHeaders,
      options,
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

const px = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? `${value}px` : undefined);

function applySchematicOptions(root: HTMLElement, options?: SchematicOptions): void {
  const properties: Record<string, string | undefined> = {
    '--chc-schematic-slot-h': px(options?.slotHeight),
    '--chc-schematic-matchup-w': px(options?.matchUpWidth),
    '--chc-schematic-radius': options?.radius,
    '--chc-schematic-connector-color': options?.connectorColor,
    '--chc-schematic-slot-color': options?.slotColor
  };
  for (const [property, value] of Object.entries(properties)) {
    if (value) root.style.setProperty(property, value);
  }
}
