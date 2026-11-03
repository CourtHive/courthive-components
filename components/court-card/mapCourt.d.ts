import { CourtSport } from '../courts/courtSvgUtil';
import { CourtCardData } from './types';
export interface MapCourtOptions {
    /** Parent tournament's resolved sport — used for the court-SVG fallback. */
    sport?: CourtSport;
}
export declare function mapCourtToCardData(court: any, options?: MapCourtOptions): CourtCardData;
