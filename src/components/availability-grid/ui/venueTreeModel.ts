/**
 * What the availability grid's venue tree shows, apart from the DOM: which courts are visible (so their
 * checkbox is checked), grouped by venue. `AvailabilityGrid.updateVenueTree` renders this model.
 */
import { availability } from 'tods-competition-factory';

type CourtMeta = availability.CourtMeta;
type CourtRef = availability.CourtRef;

/** The visibility key, in the controller's resource-id format: `tournamentId|venueId|courtId`. */
export function courtVisibilityKey(ref: CourtRef): string {
  return `${ref.tournamentId}|${ref.venueId}|${ref.courtId}`;
}

/**
 * Until the user customises visibility, every court the engine lists is visible — including courts that
 * arrive after an earlier render found none. Once customised, the selection is the user's, and an
 * EMPTY selection means "no courts", not "all courts".
 */
export function resolveVisibleCourts(courtMeta: CourtMeta[], current: Set<string>, customized: boolean): Set<string> {
  if (customized) return current;
  return new Set(courtMeta.map((meta) => courtVisibilityKey(meta.ref)));
}

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

export function buildVenueTreeModel(
  courtMeta: CourtMeta[],
  visibleCourts: Set<string>,
  venueNames: Map<string, string> = new Map()
): VenueTreeVenue[] {
  const venues = new Map<string, VenueTreeVenue>();
  for (const meta of courtMeta) {
    const venueId = meta.ref.venueId;
    let venue = venues.get(venueId);
    if (!venue) {
      venue = { venueId, venueName: venueNames.get(venueId) || venueId, checked: true, courts: [] };
      venues.set(venueId, venue);
    }
    const checked = visibleCourts.has(courtVisibilityKey(meta.ref));
    venue.courts.push({ meta, checked });
    if (!checked) venue.checked = false;
  }
  return [...venues.values()];
}
