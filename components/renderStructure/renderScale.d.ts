import { Composition, IndividualParticipant, MatchUp } from '../../types';
export declare function renderScale({ individualParticipant, composition, className, matchUp, spacer }: {
    individualParticipant?: IndividualParticipant;
    composition?: Composition;
    className?: string;
    matchUp?: MatchUp;
    spacer?: boolean;
}): HTMLElement;
