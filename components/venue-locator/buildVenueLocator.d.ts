import { VenueLocatorCallbacks, VenueLocatorConfig, VenueLocatorCourt, VenueLocatorData, VenueLocatorTileLayer, VenueLocatorView } from './types';
export declare function hasVenueGeo(data: VenueLocatorData): boolean;
/** Re-exported so the locator's public surface stays stable; the comparator is shared with court-layout. */
export declare function sortVenueCourts(courts: VenueLocatorCourt[]): VenueLocatorCourt[];
export declare function describeCourt(court: VenueLocatorCourt): string;
export declare function buildVenueLocator(data: VenueLocatorData, config?: Partial<VenueLocatorConfig>, callbacks?: VenueLocatorCallbacks): HTMLElement;
/** Remove the Leaflet instance and observers for a locator built by buildVenueLocator. */
export declare function destroyVenueLocator(root: HTMLElement): void;
/**
 * Leaflet ships its own stylesheet, and this component deliberately does not import it (leaflet is
 * an optional peerDependency, so a static CSS import would make it mandatory). Without it Leaflet's
 * panes are unpositioned and the map paints as a broken band of tiles — a failure that looks like a
 * component bug and is silent otherwise. `.leaflet-container` is `position: relative` in that
 * stylesheet, so anything else means it never loaded.
 */
export declare function leafletCssMissing(containerPosition: string | undefined): boolean;
export declare function isDarkTheme(): boolean;
/**
 * Which tile source a given view should render right now. The street view swaps to a real dark
 * basemap under a dark theme — filtering light tiles to fake one produces a false-colour negative.
 * Satellite never swaps: there is no dark equivalent of a photograph.
 */
export declare function resolveTileLayer(cfg: VenueLocatorConfig, view: VenueLocatorView, dark: boolean): VenueLocatorTileLayer;
