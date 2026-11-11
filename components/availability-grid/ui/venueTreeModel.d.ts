import { availability } from 'tods-competition-factory';
type CourtMeta = availability.CourtMeta;
type CourtRef = availability.CourtRef;
/** The visibility key, in the controller's resource-id format: `tournamentId|venueId|courtId`. */
export declare function courtVisibilityKey(ref: CourtRef): string;
/**
 * Until the user customises visibility, every court the engine lists is visible — including courts that
 * arrive after an earlier render found none. Once customised, the selection is the user's, and an
 * EMPTY selection means "no courts", not "all courts".
 */
export declare function resolveVisibleCourts(courtMeta: CourtMeta[], current: Set<string>, customized: boolean): Set<string>;
export interface VenueTreeCourt {
    meta: CourtMeta;
    checked: boolean;
}
export interface VenueTreeVenue {
    venueId: string;
    venueName: string;
    /** Every court in the venue is visible. */
    checked: boolean;
    courts: VenueTreeCourt[];
}
export declare function buildVenueTreeModel(courtMeta: CourtMeta[], visibleCourts: Set<string>, venueNames?: Map<string, string>): VenueTreeVenue[];
export {};
