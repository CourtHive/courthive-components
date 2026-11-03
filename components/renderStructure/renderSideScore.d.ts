import { Composition, EventHandlers, MatchUp, SetScore } from '../../types';
export declare function setScore({ gameScoreOnly, scoreStripes, set, sideNumber }: {
    gameScoreOnly?: boolean;
    scoreStripes?: boolean;
    set: SetScore & {
        editing?: number;
    };
    sideNumber: number;
}): HTMLElement;
export declare function renderSideScore({ participantHeight, eventHandlers, composition, sideNumber, matchUp }: {
    participantHeight?: number;
    eventHandlers?: EventHandlers;
    composition?: Composition;
    sideNumber: number;
    matchUp: MatchUp;
}): HTMLElement;
