import { Composition, EventHandlers, MatchUp, Participant } from '../../types';
export declare function renderParticipant({ initialRoundNumber, eventHandlers, sideContainer, composition, participant, placeholder, sideNumber, matchUp }: {
    initialRoundNumber?: number;
    eventHandlers?: EventHandlers;
    sideContainer?: boolean;
    composition?: Composition;
    participant?: Participant;
    placeholder?: any;
    sideNumber?: number;
    matchUp?: MatchUp;
}): HTMLElement;
