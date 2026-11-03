import { EventMatchUpCounts, EventStatusPill } from './types';
export interface EventStatusResolverInput {
    allDrawsCancelled?: boolean;
    drawCount?: number;
    entryCount?: number;
    startDate?: string;
    endDate?: string;
    matchUpCounts?: EventMatchUpCounts;
    /** True when at least one drawDefinition carries the DRAFT_STATE extension. */
    hasDraftState?: boolean;
    /** True when at least one drawDefinition was generated with `automated.seedsOnly`. */
    hasSeedsOnlyDraw?: boolean;
}
export declare function resolveEventStatus(input: EventStatusResolverInput, now?: Date): EventStatusPill | null;
