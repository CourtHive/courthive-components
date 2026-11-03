import { Composition, EventHandlers, MatchUp } from '../../types';
export declare function renderStructure({ initialRoundNumber, selectedMatchUpId, eventHandlers, searchActive, composition, structureId, finalColumn, favourites, carousel, matchUps, minWidth, context }: {
    initialRoundNumber?: number;
    selectedMatchUpId?: string;
    eventHandlers?: EventHandlers;
    searchActive?: boolean;
    composition?: Composition;
    structureId?: string;
    finalColumn?: boolean | HTMLElement;
    /**
     * participantIds the host pins (a pair's or an individual's): their sides take the favourite style and
     * their matchUps carry `data-favourite`. Host state, so a parameter rather than a composition option.
     */
    favourites?: string[] | Set<string>;
    /**
     * Lay the rounds out as a horizontal carousel for narrow screens: one round per scroll-snap stop, with
     * `peek` (default 0.2) of the next round showing, so connectors lead somewhere. Round headers move with
     * their column. Pair it with `renderRoundPager` for a pager. The host decides when, e.g. by viewport.
     */
    carousel?: boolean | {
        peek?: number;
    };
    matchUps: MatchUp[];
    minWidth?: string;
    context?: any;
}): HTMLElement;
/**
 * Mark the sides of pinned participants. A side matches on its own participantId (a pair, a team) or on any
 * of its individuals', so pinning one player of a pair pins the pair's side. Exported for hosts that render
 * matchUps one at a time.
 */
export declare function applyFavourites(root: HTMLElement, favourites?: string[] | Set<string>): void;
