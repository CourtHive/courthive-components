import { Composition, IndividualParticipant, MatchUp, Side } from '../../types';
export declare function renderFrill({ individualParticipant, composition, className, matchUp, spacer, side, type }: {
    individualParticipant?: IndividualParticipant;
    composition?: Composition;
    className?: string;
    matchUp?: MatchUp;
    spacer?: boolean;
    side?: Side;
    type?: string;
}): HTMLElement;
