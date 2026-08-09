/**
 * Venue Locator — public surface.
 *
 * Requires the optional peerDependency `leaflet` (and its stylesheet) in the host:
 *   pnpm add leaflet
 *   import 'leaflet/dist/leaflet.css';
 * Without it the component still renders — header + court list, with a "Map unavailable" zone.
 */

export {
  buildVenueLocator,
  destroyVenueLocator,
  describeCourt,
  hasVenueGeo,
  leafletCssMissing,
  sortVenueCourts
} from './buildVenueLocator';
export { mapVenueToLocatorData } from './mapVenue';
export { DEFAULT_VENUE_LOCATOR_CONFIG, mergeVenueLocatorConfig } from './defaultConfig';

export type {
  VenueLocatorCallbacks,
  VenueLocatorConfig,
  VenueLocatorCourt,
  VenueLocatorData,
  VenueLocatorLayout,
  VenueLocatorTileLayer,
  VenueLocatorView
} from './types';
