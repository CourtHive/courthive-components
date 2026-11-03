import { Composition, EventHandlers, MatchUp } from '../../types';
export declare function renderSide({ initialRoundNumber, eventHandlers, composition, sideNumber, className, matchUp }: {
    initialRoundNumber?: number;
    eventHandlers?: EventHandlers;
    composition?: Composition;
    sideNumber: number;
    className?: string;
    matchUp: MatchUp;
}): HTMLElement;
