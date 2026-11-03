import { Composition, EventHandlers, MatchUp, Side } from '../../types';
export declare function renderParticipantInput({ matchUp, side, sideNumber, eventHandlers, composition, position, currentParticipant }: {
    matchUp: MatchUp;
    side?: Side;
    sideNumber?: number;
    eventHandlers?: EventHandlers;
    composition?: Composition;
    position?: number;
    currentParticipant?: any;
}): HTMLElement;
