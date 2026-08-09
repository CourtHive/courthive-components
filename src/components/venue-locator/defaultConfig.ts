/**
 * Venue Locator — Default Configuration.
 *
 * Tile defaults intentionally match TMX's `config/locationConfig.ts` leafletDefaults, so the
 * component looks the same whether a host passes its own config or takes these.
 */

import { VenueLocatorConfig } from './types';

export const DEFAULT_VENUE_LOCATOR_CONFIG: VenueLocatorConfig = {
  tiles: {
    map: {
      tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> Contributors',
      maxZoom: 18
    },
    satellite: {
      tileLayer: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri'
    }
  },
  // CARTO Dark Matter — a purpose-designed dark basemap, keyless, zoom to 20. Chosen over inverting
  // the OSM street tiles (a muddy false-colour negative) and over Esri's Dark Gray Canvas, which
  // needs no new provider but stops at zoom 16 — too shallow for looking at a single club.
  // Attribution is required and carried below. Hosts at production volume should review CARTO's
  // basemap terms, or pass their own `darkTileLayer`.
  darkTileLayer: {
    tileLayer: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> Contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  },
  view: 'map',
  showViewToggle: true,
  zoom: 16,
  height: '320px',
  courtsLayout: 'side',
  showHeader: true,
  showPopup: true,
  scrollWheelZoom: false,
  darkTiles: 'auto'
};

export function mergeVenueLocatorConfig(override?: Partial<VenueLocatorConfig>): VenueLocatorConfig {
  if (!override) return DEFAULT_VENUE_LOCATOR_CONFIG;
  return {
    tiles: override.tiles ?? DEFAULT_VENUE_LOCATOR_CONFIG.tiles,
    // `!== undefined` not `??`: an explicit null means "no dark basemap, use the filter"
    darkTileLayer:
      override.darkTileLayer !== undefined ? override.darkTileLayer : DEFAULT_VENUE_LOCATOR_CONFIG.darkTileLayer,
    view: override.view ?? DEFAULT_VENUE_LOCATOR_CONFIG.view,
    showViewToggle: override.showViewToggle ?? DEFAULT_VENUE_LOCATOR_CONFIG.showViewToggle,
    zoom: override.zoom ?? DEFAULT_VENUE_LOCATOR_CONFIG.zoom,
    height: override.height ?? DEFAULT_VENUE_LOCATOR_CONFIG.height,
    courtsLayout: override.courtsLayout ?? DEFAULT_VENUE_LOCATOR_CONFIG.courtsLayout,
    showHeader: override.showHeader ?? DEFAULT_VENUE_LOCATOR_CONFIG.showHeader,
    showPopup: override.showPopup ?? DEFAULT_VENUE_LOCATOR_CONFIG.showPopup,
    scrollWheelZoom: override.scrollWheelZoom ?? DEFAULT_VENUE_LOCATOR_CONFIG.scrollWheelZoom,
    darkTiles: override.darkTiles ?? DEFAULT_VENUE_LOCATOR_CONFIG.darkTiles
  };
}
