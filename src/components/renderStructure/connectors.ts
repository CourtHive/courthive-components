import { drawDefinitionConstants } from 'tods-competition-factory';
import cx from 'classnames';

// constants and types
import type { MatchUp } from '../../types';

const { QUALIFYING } = drawDefinitionConstants;

/**
 * How a matchUp connects to the next round: `m1` / `m2` the upper / lower matchUp of a pair (the line turns
 * down / up to their junction), `m0` straight across (a feed or qualifying round), `noProgression` the final,
 * `mr` no connector at all (round robin, ad hoc, lucky, a search result, a tie's collection).
 */
export type ConnectorVariant = 'm1' | 'm2' | 'm0' | 'noProgression' | 'mr';

export function connectorVariant({
  searchActive,
  isFinalRound,
  matchUp,
  isAdHoc,
  isLucky,
  moiety
}: {
  searchActive?: boolean;
  isFinalRound?: boolean;
  matchUp: MatchUp;
  isAdHoc?: boolean;
  isLucky?: boolean;
  moiety?: boolean;
}): ConnectorVariant {
  const finalRound = isFinalRound || (matchUp.finishingRound ? Number(matchUp.finishingRound) === 1 : false);
  const isQualifying = matchUp.stage === QUALIFYING && finalRound;
  if (searchActive || matchUp.isRoundRobin || matchUp.collectionId || isLucky || isAdHoc) return 'mr';
  if (finalRound) return 'noProgression';
  if (isQualifying || matchUp.preFeedRound) return 'm0';
  return moiety ? 'm1' : 'm2';
}

/**
 * The cell a connected matchUp sits in. A round of cells is a grid of equal rows, so a cell in the next round
 * spans exactly the two it is fed by, and the connector is drawn from the cell as percentages of its height:
 * no JS heights, and nothing depends on how tall a card is.
 */
export function renderConnectorCell({
  connectorWidth,
  isFirstRound,
  variant
}: {
  connectorWidth?: number;
  isFirstRound?: boolean;
  variant: ConnectorVariant;
}): HTMLElement {
  const cell = document.createElement('div');
  cell.className = cx(
    'chc-cell',
    'chc-link',
    isFirstRound && 'chc-link--first-round',
    variant === 'm1' && 'chc-link--m1',
    variant === 'm2' && 'chc-link--m2',
    variant === 'm0' && 'chc-link--m0',
    variant === 'noProgression' && 'chc-link--no-progression'
  );
  // otherwise the stylesheet's default, the round gap, so the line spans the gap whatever the density
  if (connectorWidth) cell.style.setProperty('--chc-connector-w', `${connectorWidth}px`);
  return cell;
}
