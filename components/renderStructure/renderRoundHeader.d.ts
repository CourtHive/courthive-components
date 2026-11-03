import { EventHandlers, MatchUp, StructureRenderers } from '../../types';
export declare function renderRoundHeader({ eventHandlers, roundMatchUps, roundProfile, roundNumber, renderers, context }: {
    eventHandlers?: EventHandlers;
    roundMatchUps?: MatchUp[];
    roundProfile?: any;
    roundNumber: number;
    renderers?: StructureRenderers;
    context?: any;
}): HTMLElement;
