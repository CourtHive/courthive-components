import { Composition, EventHandlers, MatchUp } from '../../types';
/**
 * Re-render one matchUp of a rendered structure and swap it in, instead of rebuilding the structure and
 * diffing the whole tree, e.g. on a live score update. The matchUp's place in the structure (the view's first
 * round, final / lucky / ad hoc / search) is read from what `renderMatchUp` recorded on its `.tmx-m`, so the
 * swapped node is what a full render would have produced. Its connector belongs to the cell around it, which
 * the swap keeps.
 *
 * Returns the new node, or undefined when the matchUp is not in `root`. The path index behind
 * `configuration.pathHighlight` is built per structure render, so a path reflects the last full render.
 */
export declare function renderMatchUpInPlace({ selectedMatchUpId, eventHandlers, composition, favourites, matchUp, root }: {
    selectedMatchUpId?: string;
    eventHandlers?: EventHandlers;
    composition?: Composition;
    favourites?: string[] | Set<string>;
    matchUp: MatchUp;
    root: Element | Document;
}): HTMLElement | undefined;
