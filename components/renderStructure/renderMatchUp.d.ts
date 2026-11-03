import { Composition, EventHandlers, MatchUp } from '../../types';
export declare function renderMatchUp(params: {
    composition?: Composition;
    initialRoundNumber?: number;
    matchUp: MatchUp;
    /**
     * @deprecated The connector is drawn by the cell `renderRound` puts the matchUp in, so a matchUp no longer
     * needs to know whether it is the upper or lower of a pair. Ignored.
     */
    moiety?: boolean;
    selectedMatchUpId?: string;
    searchActive?: boolean;
    isFinalRound?: boolean;
    isLucky?: boolean;
    isAdHoc?: boolean;
    eventHandlers?: EventHandlers;
    className?: string;
    /**
     * @deprecated Connector heights are no longer computed: a round is a grid of equal rows and the connector is
     * drawn as percentages of its cell. Ignored.
     */
    roundFactor?: number;
}): HTMLElement;
