import { renderSchematicMatchUp } from './renderSchematicMatchUp';
import type { SchematicMatchUp } from './renderSchematicMatchUp';

/**
 * Renders a round column with optional simplified header (round number only)
 * and compact schematic matchups.
 */
export function renderSchematicRound({
  initialRoundFactor,
  initialRoundNumber = 1,
  isFinalRound,
  isRoundRobin,
  roundNumber,
  matchUps,
  showHeader,
  isLucky
}: {
  initialRoundFactor?: number;
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

  // Derived per render and passed down — never written back onto the matchUp.
  // See the same note in `renderStructure/renderRound.ts`: an in-place rescale
  // compounds across renders and shortens the connectors a little more each time.
  const displayRoundFactor = (matchUp: SchematicMatchUp): number => {
    if (!matchUp.roundFactor) return Math.pow(2, roundNumber - initialRoundNumber);
    return initialRoundFactor ? matchUp.roundFactor / initialRoundFactor : matchUp.roundFactor;
  };

  roundMatchUps.forEach((matchUp, i) => {
    const moiety = i % 2 === 0;
    const isFirstRound = roundNumber === initialRoundNumber;

    const m = renderSchematicMatchUp({
      roundFactor: displayRoundFactor(matchUp),
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

  // Mark pre-feed rounds for visual highlighting (lucky draw)
  const isPreFeed = roundMatchUps.some((m) => m.preFeedRound) && !isFinalRound;
  if (isPreFeed) {
    roundContainer.classList.add('chc-schematic-round--pre-feed');
  }

  roundContainer.appendChild(round);
  return roundContainer;
}
