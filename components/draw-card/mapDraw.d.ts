import { DrawCardData, DrawMatchUpCounts, DrawStatusPill } from './types';
export interface MapDrawOptions {
    lightMode?: boolean;
    matchUpStats?: DrawMatchUpCounts;
    /** Pre-computed averages (consumer might fetch via factory.getRatingsStats). */
    utrAvg?: number;
    wtnAvg?: number;
    /** Pre-resolved publish flags from publishingGovernor. */
    published?: boolean;
    embargoActive?: boolean;
    /** Pre-resolved entry count (consumer often has this via getAssignedParticipantIds). */
    entryCount?: number;
    /** Back-reference for click handlers. */
    eventId?: string;
    /** Override the resolved status. */
    statusOverride?: DrawStatusPill | null;
}
export declare function mapDrawDefinitionToCardData(drawDefinition: any, options?: MapDrawOptions): DrawCardData;
