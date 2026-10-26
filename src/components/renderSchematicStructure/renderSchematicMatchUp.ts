import { drawDefinitionConstants } from 'tods-competition-factory';
import cx from 'classnames';

const { QUALIFYING } = drawDefinitionConstants;

/**
 * The schematic's geometry and colours. Every value has a default equal to the original fixed rendering, so
 * leaving it out changes nothing. Set on the structure root as CSS variables, which the stylesheet reads.
 */
export interface SchematicOptions {
  /** height in px of one participant slot; a matchUp is two slots and a 1px divider. Default 5 */
  slotHeight?: number;
  /** width in px of the connector between rounds. Default 8 */
  connectorWidth?: number;
  /** width in px of a matchUp. Default 40 */
  matchUpWidth?: number;
  /** corner radius of a slot, any CSS length. Default 1px */
  radius?: string;
  /** connector colour, any CSS colour. Default the structure's connector colour */
  connectorColor?: string;
  /** slot fill, any CSS colour. Default `--chc-border-primary` */
  slotColor?: string;
}

export const SCHEMATIC_DEFAULTS = { slotHeight: 5, connectorWidth: 8, matchUpWidth: 40 };

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
 * Renders a compact matchup: two slots (5px tall by default, `slotHeight`) separated by a 1px divider.
 * Total height 11px by default, vs ~60px for the full renderMatchUp.
 */
export function renderSchematicMatchUp({
  matchUp,
  moiety,
  isFirstRound,
  isFinalRound,
  isRoundRobin,
  roundFactor: roundFactorParam,
  connectorWidth = SCHEMATIC_DEFAULTS.connectorWidth,
  slotHeight = SCHEMATIC_DEFAULTS.slotHeight,
  isLucky
}: {
  matchUp: SchematicMatchUp;
  moiety?: boolean;
  isFirstRound?: boolean;
  isFinalRound?: boolean;
  isRoundRobin?: boolean;
  isLucky?: boolean;
  initialRoundNumber?: number;
  /**
   * Connector scale for THIS render, supplied by `renderSchematicRound`.
   * Falls back to the matchUp's own factor for direct callers.
   */
  roundFactor?: number;
  /** `SchematicOptions.slotHeight`, which the connector heights scale with */
  slotHeight?: number;
  connectorWidth?: number;
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
  const roundFactor = roundFactorParam ?? matchUp.roundFactor ?? 1;
  const matchUpHeight = 2 * slotHeight + 1; // slot + 1px divider + slot
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
