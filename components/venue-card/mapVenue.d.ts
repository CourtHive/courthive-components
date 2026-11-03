import { CourtSport } from '../courts/courtSvgUtil';
import { VenueCardData } from './types';
export interface MapVenueOptions {
    /** Parent tournament's resolved sport — used for the court-SVG fallback. */
    sport?: CourtSport;
}
export declare function mapVenueToCardData(venue: any, options?: MapVenueOptions): VenueCardData;
