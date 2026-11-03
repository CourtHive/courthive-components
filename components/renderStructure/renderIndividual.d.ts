import { Composition, EventHandlers, IndividualParticipant, MatchUp, Side } from '../../types';
export declare function renderIndividual(params: {
    isWinningSide?: boolean;
    side?: Side;
    sideNumber?: number;
    individualParticipant?: IndividualParticipant;
    matchUp?: MatchUp;
    composition?: Composition;
    eventHandlers?: EventHandlers;
}): {
    element: HTMLElement;
};
