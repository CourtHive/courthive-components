import { CourtSport } from '../../components/courts/courtSvgUtil';
import { CardOnlineResource } from './types';
export declare function extractImageURL(resources: CardOnlineResource[] | undefined, name: string): string | undefined;
export declare function extractCourtSvgSport(resources: CardOnlineResource[] | undefined, name?: string): CourtSport | undefined;
