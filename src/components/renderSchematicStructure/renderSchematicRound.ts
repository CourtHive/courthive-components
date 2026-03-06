import { renderSchematicMatchUp } from './renderSchematicMatchUp';
import type { SchematicMatchUp } from './renderSchematicMatchUp';

/**
 * Renders a round column with optional simplified header (round number only)
 * and compact schematic matchups.
 */
export function renderSchematicRound({
  initialRoundNumber = 1,
  isFinalRound,
  isRoundRobin,
  roundNumber,
  matchUps,
  showHeader,
  isLucky
}: {
  initialRoundNumber?: number;
  isFinalRound?: boolean;
  isRoundRobin?: boolean;
  roundNumber: number;
  matchUps: SchematicMatchUp[];
  showHeader?: boolean;
  isLucky?: boolean;
}): HTMLElement {
  const roundMatchUps = matchUps
    .filter((m) => m.roundNumber === roundNumber)
    .sort((a, b) => (a.roundPosition || 0) - (b.roundPosition || 0));

  const roundContainer = document.createElement('div');
  roundContainer.className = 'chc-schematic-round-container';
  roundContainer.dataset.roundNumber = String(roundNumber);

  if (showHeader) {
    const header = document.createElement('div');
    header.className = 'chc-schematic-round-header';
    header.textContent = `R${roundNumber}`;
    roundContainer.appendChild(header);
  }

  const round = document.createElement('div');
  round.className = 'chc-schematic-round';

  roundMatchUps.forEach((matchUp, i) => {
    if (!matchUp.roundFactor) {
      matchUp.roundFactor = Math.pow(2, roundNumber - initialRoundNumber);
    }
    const moiety = i % 2 === 0;
    const isFirstRound = roundNumber === initialRoundNumber;

    const m = renderSchematicMatchUp({
      initialRoundNumber,
      isRoundRobin,
      isFinalRound,
      isFirstRound,
      isLucky,
      matchUp,
      moiety
    });
    round.appendChild(m);
  });

  roundContainer.appendChild(round);
  return roundContainer;
}
