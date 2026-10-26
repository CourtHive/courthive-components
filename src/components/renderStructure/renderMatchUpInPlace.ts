import { applyFavourites } from './renderStructure';
import { renderMatchUp } from './renderMatchUp';

// constants and types
import type { Composition, EventHandlers, MatchUp } from '../../types';

/**
 * Re-render one matchUp of a rendered structure and swap it in, instead of rebuilding the structure and
 * diffing the whole tree, e.g. on a live score update. The matchUp's place in the structure (moiety, round
 * factor, the view's first round, final / lucky / ad hoc / search) is read from what `renderMatchUp`
 * recorded on its `.tmx-m`, so the swapped node is what a full render would have produced.
 *
 * Returns the new node, or undefined when the matchUp is not in `root`. The path index behind
 * `configuration.pathHighlight` is built per structure render, so a path reflects the last full render.
 */
export function renderMatchUpInPlace({
  selectedMatchUpId,
  eventHandlers,
  composition,
  favourites,
  matchUp,
  root
}: {
  selectedMatchUpId?: string;
  eventHandlers?: EventHandlers;
  composition?: Composition;
  favourites?: string[] | Set<string>;
  matchUp: MatchUp;
  root: Element | Document;
}): HTMLElement | undefined {
  const existing = root.querySelector<HTMLElement>(`.tmx-m[id="${CSS.escape(matchUp.matchUpId)}"]`);
  if (!existing) return undefined;

  const { dataset } = existing;
  const number = (value?: string) => (value === undefined ? undefined : Number(value));
  const fresh = renderMatchUp({
    initialRoundNumber: number(dataset.initialRound),
    roundFactor: number(dataset.roundFactor),
    moiety: dataset.moiety === undefined ? undefined : dataset.moiety === 'true',
    isFinalRound: dataset.finalRound === 'true',
    searchActive: dataset.searchActive === 'true',
    isAdHoc: dataset.adHoc === 'true',
    isLucky: dataset.lucky === 'true',
    selectedMatchUpId,
    eventHandlers,
    composition,
    matchUp
  });
  applyFavourites(fresh, favourites);
  existing.replaceWith(fresh);
  return fresh;
}
