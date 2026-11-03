import { EventHandlers, MatchUp } from '../../types';
export declare function renderCenterInfo({ eventHandlers, entryStatus, sideNumber, className, matchUp }: {
    eventHandlers?: EventHandlers;
    entryStatus?: string;
    sideNumber?: number;
    className?: string;
    matchUp?: MatchUp;
}): {
    element: HTMLElement;
};
