/**
 * Venue Locator — Type Definitions
 *
 * Flat data + JSON-serializable config consumed by buildVenueLocator.
 * Mirrors the venue-card / court-card pattern.
 *
 * Scope: ONE venue on a real map — "where is this club". Courts are LISTED beside the
 * map rather than plotted on it, because the facility registry carries coordinates on the
 * facility, not per court (`facility_courts` has no latitude/longitude). If per-court geo
 * ever lands, `VenueLocatorCourt.latitude/longitude` is where it plugs in.
 */

// ============================================================================
// Data
// ============================================================================

export interface VenueLocatorCourt {
  courtId: string;
  courtName: string;
  /** INDOOR / OUTDOOR / undefined (unknown). */
  indoorOutdoor?: 'INDOOR' | 'OUTDOOR';
  /** Surface category (HARD/CLAY/GRASS/CARPET/...) — raw upper-case. */
  surfaceCategory?: string;
  /** True when the court has floodlights. */
  floodlit?: boolean;
  /** Ordering within the venue (TODS courtOrder). Sorted ascending when present. */
  courtOrder?: number;
  /**
   * Per-court coordinates. Unused today — the registry stores geo on the facility only.
   * When present the court is plotted as its own marker instead of folding into the venue pin.
   */
  latitude?: number;
  longitude?: number;
}

export interface VenueLocatorData {
  venueId: string;
  venueName: string;
  venueAbbreviation?: string;
  /** Pre-formatted "123 Main St, City, REGION" — rendered under the title and in the popup. */
  addressFormatted?: string;
  /** Venue coordinates. Without both, the component renders its no-geo state. */
  latitude?: number;
  longitude?: number;
  /** Courts at this venue, listed beside the map. */
  courts?: VenueLocatorCourt[];
  /** Free-form note rendered under the address. */
  notes?: string;
}

// ============================================================================
// Config
// ============================================================================

/**
 * A tile layer definition. Deliberately the same shape TMX already uses in
 * `config/locationConfig.ts` so a consumer can pass `env.leaflet.map` /
 * `env.leaflet.satellite` straight through without translation.
 */
export interface VenueLocatorTileLayer {
  tileLayer: string;
  attribution: string;
  maxZoom?: number;
}

export type VenueLocatorView = 'map' | 'satellite';

/** Where the court list sits relative to the map. */
export type VenueLocatorLayout = 'side' | 'below' | 'none';

export interface VenueLocatorConfig {
  /** Tile sources. Defaults mirror TMX's leafletConfig defaults (OSM + Esri imagery). */
  tiles: Record<VenueLocatorView, VenueLocatorTileLayer>;
  /**
   * Street tiles used under a dark theme. Kept OUT of `tiles` on purpose: `tiles` is keyed by
   * VenueLocatorView and drives the view toggle, and a dark basemap is the same view rendered
   * differently, not a third thing to choose. Set to `null` to force the CSS-filter path.
   */
  darkTileLayer: VenueLocatorTileLayer | null;
  /** Which tile source to show first. */
  view: VenueLocatorView;
  /** Render the map/satellite toggle. Hidden when only one tile source is configured. */
  showViewToggle: boolean;
  /** Initial zoom on the venue. */
  zoom: number;
  /** Map height as any CSS length. */
  height: string;
  /** Court list placement. */
  courtsLayout: VenueLocatorLayout;
  /** Show the venue title + address block above the map. */
  showHeader: boolean;
  /** Open a popup on the venue marker with name + address. */
  showPopup: boolean;
  /** Allow scroll-wheel zoom. Off by default so the map doesn't hijack page scroll. */
  scrollWheelZoom: boolean;
  /**
   * Dark-theme handling for the street view.
   *  'auto'  — swap to `darkTileLayer` when the theme is dark; if no dark layer is configured,
   *            fall back to inverting the street tiles in CSS (legible, but not pretty).
   *  'never' — always render the light street tiles.
   * Satellite is never darkened either way: inverting imagery yields a false-colour photo, and
   * there is no dark equivalent of a photograph.
   */
  darkTiles: 'auto' | 'never';
}

// ============================================================================
// Callbacks
// ============================================================================

export interface VenueLocatorCallbacks {
  /** Venue marker (or its popup) clicked. */
  onVenueClick?: (data: VenueLocatorData) => void;
  /** A court in the list was clicked. */
  onCourtClick?: (court: VenueLocatorCourt, data: VenueLocatorData) => void;
  /** Tile view switched. */
  onViewChange?: (view: VenueLocatorView) => void;
  /**
   * Leaflet could not be loaded or the map failed to initialize. The component has already
   * rendered its fallback (header + court list) by the time this fires — it is a signal for
   * the host to log, not an error the host must handle to keep the UI coherent.
   */
  onMapUnavailable?: (reason: Error) => void;
}
