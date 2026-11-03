import { EventCardData, EventMatchUpCounts, EventStatusPill } from './types';
import { CourtSport } from '../courts/courtSvgUtil';
export interface MapEventOptions {
    /** Skip matchUp walk for large event counts (TMX uses threshold 15). */
    lightMode?: boolean;
    /** Override match counts (caller fetched via factory engine). */
    matchUpStats?: EventMatchUpCounts;
    /** Parent tournament's resolved sport — used for court-SVG fallback. */
    sport?: CourtSport;
    now?: Date;
    /** Override the resolved status. */
    statusOverride?: EventStatusPill | null;
}
export declare function mapEventToCardData(event: any, options?: MapEventOptions): EventCardData;
