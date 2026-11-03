import { Composition, EventHandlers, MatchUp } from '../../types';
export declare function renderRound({ initialRoundNumber, selectedMatchUpId, eventHandlers, isFinalRound, isRoundRobin, searchActive, composition, roundNumber, roundProfile, minWidth, matchUps, context, isLucky }: {
    initialRoundNumber?: number;
    selectedMatchUpId?: string;
    eventHandlers?: EventHandlers;
    isFinalRound?: boolean;
    isRoundRobin?: boolean;
    searchActive?: boolean;
    composition?: Composition;
    /**
     * @deprecated Connector heights are no longer computed (see `connectors.ts`), so there is no scale to
     * override. Ignored.
     */
    roundFactor?: number;
    roundNumber: number;
    roundProfile?: any;
    minWidth?: string;
    matchUps: MatchUp[];
    context?: any;
    isLucky?: boolean;
}): HTMLElement;
