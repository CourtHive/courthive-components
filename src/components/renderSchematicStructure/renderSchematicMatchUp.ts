import { drawDefinitionConstants } from 'tods-competition-factory';
import cx from 'classnames';

const { QUALIFYING } = drawDefinitionConstants;

export interface SchematicMatchUp {
  matchUpId: string;
  roundNumber: number;
  roundPosition?: number;
  drawPositions?: number[];
  finishingRound?: number;
  roundFactor?: number;
  stage?: string;
  isRoundRobin?: boolean;
  preFeedRound?: boolean;
  structureId?: string;
  collectionId?: string;
}

/**
 * Renders a compact matchup: two 5px-tall slots separated by a 1px divider.
 * Total height 11px vs ~60px for the full renderMatchUp.
 */
export function renderSchematicMatchUp({
  matchUp,
  moiety,
  isFirstRound,
  isFinalRound,
  isRoundRobin,
  isLucky
}: {
  matchUp: SchematicMatchUp;
  moiety?: boolean;
  isFirstRound?: boolean;
  isFinalRound?: boolean;
  isRoundRobin?: boolean;
  isLucky?: boolean;
  initialRoundNumber?: number;
}): HTMLElement {
  const { stage, preFeedRound } = matchUp;
  const isQualifying = stage === QUALIFYING && isFinalRound;
  const noProgression = isFinalRound;

  const link =
    ((isRoundRobin || matchUp.collectionId || isLucky) && 'mr') ||
    (noProgression && 'noProgression') ||
    ((isQualifying || preFeedRound) && 'm0') ||
    (moiety && 'm1') ||
    'm2';

  const container = document.createElement('div');
  container.className = 'chc-schematic-matchup';

  const slot1 = document.createElement('div');
  slot1.className = 'chc-schematic-slot';

  const divider = document.createElement('div');
  divider.className = 'chc-schematic-divider';

  const slot2 = document.createElement('div');
  slot2.className = cx(
    'chc-schematic-slot',
    'chc-schematic-link',
    isFirstRound && 'chc-schematic-link--first-round',
    link === 'mr' && 'chc-schematic-link--no-link',
    link === 'm1' && 'chc-schematic-link--m1',
    link === 'm2' && 'chc-schematic-link--m2',
    link === 'm0' && 'chc-schematic-link--m0',
    link === 'noProgression' && 'chc-schematic-link--no-progression'
  );

  // Apply schematic-scale connector dimensions
  const roundFactor = matchUp.roundFactor || 1;
  const matchUpHeight = 11; // 5px slot + 1px divider + 5px slot
  const connectorWidth = 8;
  const m1Height = (matchUpHeight / 2) * roundFactor;
  const m2Height = (matchUpHeight / 2) * roundFactor;

  slot2.style.setProperty('--chc-schematic-connector-w', `${connectorWidth}px`);
  slot2.style.setProperty('--chc-schematic-m1-h', `${m1Height}px`);
  slot2.style.setProperty('--chc-schematic-m2-h', `${m2Height}px`);

  container.appendChild(slot1);
  container.appendChild(divider);
  container.appendChild(slot2);

  return container;
}
