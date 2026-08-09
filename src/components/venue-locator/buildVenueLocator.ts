/**
 * Venue Locator — DOM Factory.
 *
 * VenueLocatorData + VenueLocatorConfig -> HTMLElement, returned SYNCHRONOUSLY. Leaflet is an
 * optional peerDependency and is imported dynamically, so the map mounts a tick later; until then
 * (and forever, if leaflet is absent or the venue has no coordinates) the map zone shows the
 * fallback and the rest of the component — header, court list — is fully usable.
 *
 * Leaflet objects are typed `any` on purpose: a static `import { Map } from 'leaflet'` would make
 * an optional dependency mandatory at type-check time for every consumer.
 */

import { mergeVenueLocatorConfig } from './defaultConfig';
import { sortCourtsByOrder } from '../../helpers/cards';
import {
  vlAddressStyle,
  vlBodyBelowStyle,
  vlBodyStyle,
  vlCourtClickableStyle,
  vlCourtListStyle,
  vlCourtMetaStyle,
  vlCourtNameStyle,
  vlCourtStyle,
  vlCourtsStyle,
  vlCourtsTitleStyle,
  vlFallbackIconStyle,
  vlFallbackStyle,
  vlHeaderStyle,
  vlMapInvertibleStyle,
  vlMapStyle,
  vlMapWrapStyle,
  vlMarkerStyle,
  vlNotesStyle,
  vlPipStyle,
  vlPopupAddressStyle,
  vlPopupTitleStyle,
  vlRootStyle,
  vlTitleStyle,
  vlToggleButtonStyle,
  vlToggleStyle
} from './styles';
import {
  VenueLocatorCallbacks,
  VenueLocatorConfig,
  VenueLocatorCourt,
  VenueLocatorData,
  VenueLocatorTileLayer,
  VenueLocatorView
} from './types';

const NO_GEO_MESSAGE = 'No coordinates for this venue';
const MAP_UNAVAILABLE_MESSAGE = 'Map unavailable';

/** Teardown per rendered root — Leaflet leaks listeners and tile requests without an explicit remove(). */
const teardowns = new WeakMap<HTMLElement, () => void>();

export function hasVenueGeo(data: VenueLocatorData): boolean {
  return Number.isFinite(data.latitude) && Number.isFinite(data.longitude);
}

/** Re-exported so the locator's public surface stays stable; the comparator is shared with court-layout. */
export function sortVenueCourts(courts: VenueLocatorCourt[]): VenueLocatorCourt[] {
  return sortCourtsByOrder(courts);
}

export function describeCourt(court: VenueLocatorCourt): string {
  const parts: string[] = [];
  if (court.indoorOutdoor) parts.push(court.indoorOutdoor.toLowerCase());
  if (court.surfaceCategory) parts.push(court.surfaceCategory.toLowerCase());
  return parts.join(' · ');
}

// ============================================================================
// Public Builder
// ============================================================================

export function buildVenueLocator(
  data: VenueLocatorData,
  config?: Partial<VenueLocatorConfig>,
  callbacks?: VenueLocatorCallbacks
): HTMLElement {
  const cfg = mergeVenueLocatorConfig(config);

  const root = document.createElement('div');
  root.className = vlRootStyle();
  root.dataset.venueId = data.venueId;

  if (cfg.showHeader) root.appendChild(buildHeader(data));

  const body = document.createElement('div');
  body.className = cfg.courtsLayout === 'side' ? vlBodyStyle() : `${vlBodyStyle()} ${vlBodyBelowStyle()}`;

  const { wrap, mapEl } = buildMapZone(data, cfg, callbacks);
  body.appendChild(wrap);

  const courts = data.courts ?? [];
  if (cfg.courtsLayout !== 'none' && courts.length) {
    body.appendChild(buildCourtList(courts, data, callbacks));
  }
  root.appendChild(body);

  if (mapEl && hasVenueGeo(data)) {
    // fire-and-forget: the element is already returned and usable
    void mountMap({ root, mapEl, data, cfg, callbacks });
  }

  return root;
}

/** Remove the Leaflet instance and observers for a locator built by buildVenueLocator. */
export function destroyVenueLocator(root: HTMLElement): void {
  const teardown = teardowns.get(root);
  if (teardown) {
    teardown();
    teardowns.delete(root);
  }
}

// ============================================================================
// Zones
// ============================================================================

function buildHeader(data: VenueLocatorData): HTMLElement {
  const header = document.createElement('div');
  header.className = vlHeaderStyle();

  const title = document.createElement('div');
  title.className = vlTitleStyle();
  title.textContent = data.venueName;
  header.appendChild(title);

  if (data.addressFormatted) {
    const address = document.createElement('div');
    address.className = vlAddressStyle();
    address.textContent = data.addressFormatted;
    header.appendChild(address);
  }
  if (data.notes) {
    const notes = document.createElement('div');
    notes.className = vlNotesStyle();
    notes.textContent = data.notes;
    header.appendChild(notes);
  }
  return header;
}

function buildFallback(message: string): HTMLElement {
  const fallback = document.createElement('div');
  fallback.className = vlFallbackStyle();
  const icon = document.createElement('div');
  icon.className = vlFallbackIconStyle();
  icon.textContent = '📍';
  icon.setAttribute('aria-hidden', 'true');
  const text = document.createElement('div');
  text.textContent = message;
  fallback.append(icon, text);
  return fallback;
}

function buildMapZone(
  data: VenueLocatorData,
  cfg: VenueLocatorConfig,
  callbacks?: VenueLocatorCallbacks
): { wrap: HTMLElement; mapEl: HTMLElement | null } {
  const wrap = document.createElement('div');
  wrap.className = vlMapWrapStyle();
  wrap.style.height = cfg.height;

  if (!hasVenueGeo(data)) {
    wrap.appendChild(buildFallback(NO_GEO_MESSAGE));
    return { wrap, mapEl: null };
  }

  const mapEl = document.createElement('div');
  mapEl.className = vlMapStyle();
  // placeholder until the dynamic import resolves; replaced by Leaflet's own DOM on success
  mapEl.appendChild(buildFallback(''));
  wrap.appendChild(mapEl);

  const views = Object.keys(cfg.tiles) as VenueLocatorView[];
  if (cfg.showViewToggle && views.length > 1) {
    wrap.appendChild(buildViewToggle(views, cfg, callbacks));
  }
  return { wrap, mapEl };
}

function buildViewToggle(
  views: VenueLocatorView[],
  cfg: VenueLocatorConfig,
  callbacks?: VenueLocatorCallbacks
): HTMLElement {
  const toggle = document.createElement('div');
  toggle.className = vlToggleStyle();
  toggle.dataset.viewToggle = 'true';
  const buttons: HTMLButtonElement[] = [];
  for (const view of views) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = vlToggleButtonStyle();
    button.dataset.view = view;
    button.textContent = view === 'satellite' ? 'Satellite' : 'Map';
    button.setAttribute('aria-pressed', String(view === cfg.view));
    // Pressed state is owned HERE, not in mountMap: the map mounts a tick later (and may never
    // mount at all if leaflet is absent), and a toggle that does nothing until then reads as broken.
    button.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      callbacks?.onViewChange?.(view);
    });
    buttons.push(button);
    toggle.appendChild(button);
  }
  return toggle;
}

function buildCourtRow(
  court: VenueLocatorCourt,
  data: VenueLocatorData,
  callbacks?: VenueLocatorCallbacks
): HTMLElement {
  const clickable = Boolean(callbacks?.onCourtClick);
  const row = document.createElement(clickable ? 'button' : 'div');
  row.className = clickable ? `${vlCourtStyle()} ${vlCourtClickableStyle()}` : vlCourtStyle();
  row.dataset.courtId = court.courtId;
  if (clickable) {
    (row as HTMLButtonElement).type = 'button';
    row.addEventListener('click', () => callbacks?.onCourtClick?.(court, data));
  }

  const name = document.createElement('span');
  name.className = vlCourtNameStyle();
  name.textContent = court.courtName;

  const meta = document.createElement('span');
  meta.className = vlCourtMetaStyle();
  const description = describeCourt(court);
  if (description) meta.append(document.createTextNode(description));
  if (court.floodlit) {
    const pip = document.createElement('span');
    pip.className = vlPipStyle();
    pip.title = 'floodlit';
    meta.appendChild(pip);
  }

  row.append(name, meta);
  return row;
}

function buildCourtList(
  courts: VenueLocatorCourt[],
  data: VenueLocatorData,
  callbacks?: VenueLocatorCallbacks
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = vlCourtsStyle();

  const title = document.createElement('div');
  title.className = vlCourtsTitleStyle();
  title.textContent = `Courts (${courts.length})`;
  panel.appendChild(title);

  const list = document.createElement('div');
  list.className = vlCourtListStyle();
  for (const court of sortVenueCourts(courts)) list.appendChild(buildCourtRow(court, data, callbacks));
  panel.appendChild(list);

  return panel;
}

// ============================================================================
// Map mounting (async, optional dependency)
// ============================================================================

interface MountArgs {
  root: HTMLElement;
  mapEl: HTMLElement;
  data: VenueLocatorData;
  cfg: VenueLocatorConfig;
  callbacks?: VenueLocatorCallbacks;
}

function popupHtml(data: VenueLocatorData): string {
  const escape = (value: string) =>
    value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  const address = data.addressFormatted
    ? `<div class="${vlPopupAddressStyle()}">${escape(data.addressFormatted)}</div>`
    : '';
  return `<div class="${vlPopupTitleStyle()}">${escape(data.venueName)}</div>${address}`;
}

async function mountMap({ root, mapEl, data, cfg, callbacks }: MountArgs): Promise<void> {
  let leaflet: any;
  try {
    leaflet = await import('leaflet');
  } catch (cause) {
    mapEl.replaceChildren(buildFallback(MAP_UNAVAILABLE_MESSAGE));
    callbacks?.onMapUnavailable?.(
      new Error('leaflet is an optional peerDependency of courthive-components and is not installed', { cause })
    );
    return;
  }

  const L = leaflet.default ?? leaflet;
  try {
    mapEl.replaceChildren();
    const map = L.map(mapEl, { scrollWheelZoom: cfg.scrollWheelZoom, attributionControl: true });
    map.setView([data.latitude, data.longitude], cfg.zoom);

    let currentView = cfg.view;
    let tiles = addTileLayer(L, map, cfg, currentView);
    applyDarkTiles(mapEl, cfg, currentView);

    const showView = (view: VenueLocatorView) => {
      currentView = view;
      map.removeLayer(tiles);
      tiles = addTileLayer(L, map, cfg, view);
      applyDarkTiles(mapEl, cfg, view);
    };

    const icon = L.divIcon({ className: '', html: `<div class="${vlMarkerStyle()}"></div>`, iconSize: [14, 14] });
    const marker = L.marker([data.latitude, data.longitude], { icon }).addTo(map);
    if (cfg.showPopup) marker.bindPopup(popupHtml(data));
    marker.on('click', () => callbacks?.onVenueClick?.(data));

    // The toggle owns its own pressed state (see buildViewToggle); this listener only swaps tiles.
    root.querySelector('[data-view-toggle]')?.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement)?.closest('button[data-view]') as HTMLElement | null;
      if (button) showView(button.dataset.view as VenueLocatorView);
    });

    warnIfLeafletCssMissing(mapEl);

    // Leaflet renders blank when its container was hidden or resized after init (drawer, tab, modal).
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(mapEl);

    // A dark basemap is a different tile URL, so unlike the colour tokens it cannot follow the theme
    // through CSS alone — re-resolve the street layer when [data-theme] changes.
    let themeObserver: MutationObserver | undefined;
    const root_ = globalThis.document?.documentElement;
    if (root_ && cfg.darkTiles !== 'never' && cfg.darkTileLayer) {
      let wasDark = isDarkTheme();
      themeObserver = new MutationObserver(() => {
        const dark = isDarkTheme();
        if (dark === wasDark) return;
        wasDark = dark;
        if (currentView !== 'satellite') showView(currentView);
      });
      themeObserver.observe(root_, { attributes: true, attributeFilter: ['data-theme'] });
    }

    teardowns.set(root, () => {
      observer.disconnect();
      themeObserver?.disconnect();
      map.remove();
    });
  } catch (cause) {
    mapEl.replaceChildren(buildFallback(MAP_UNAVAILABLE_MESSAGE));
    callbacks?.onMapUnavailable?.(new Error('Leaflet map failed to initialize', { cause }));
  }
}

let cssWarningIssued = false;

/**
 * Leaflet ships its own stylesheet, and this component deliberately does not import it (leaflet is
 * an optional peerDependency, so a static CSS import would make it mandatory). Without it Leaflet's
 * panes are unpositioned and the map paints as a broken band of tiles — a failure that looks like a
 * component bug and is silent otherwise. `.leaflet-container` is `position: relative` in that
 * stylesheet, so anything else means it never loaded.
 */
export function leafletCssMissing(containerPosition: string | undefined): boolean {
  // Leaflet's stylesheet sets `.leaflet-container { position: relative }`. An initialized container
  // that is still statically positioned means the stylesheet never loaded. An empty/undefined value
  // means we could not measure, which is not evidence of a problem — stay quiet.
  if (!containerPosition) return false;
  return containerPosition !== 'relative' && containerPosition !== 'absolute';
}

function warnIfLeafletCssMissing(mapEl: HTMLElement): void {
  if (cssWarningIssued) return;
  if (leafletCssMissing(globalThis.getComputedStyle?.(mapEl)?.position)) {
    cssWarningIssued = true;
    console.warn(
      "[courthive-components] venue-locator: leaflet's stylesheet is missing — the map will render " +
        "incorrectly. Add `import 'leaflet/dist/leaflet.css';` to the host application."
    );
  }
}

export function isDarkTheme(): boolean {
  return globalThis.document?.documentElement?.getAttribute('data-theme') === 'dark';
}

/**
 * Which tile source a given view should render right now. The street view swaps to a real dark
 * basemap under a dark theme — filtering light tiles to fake one produces a false-colour negative.
 * Satellite never swaps: there is no dark equivalent of a photograph.
 */
export function resolveTileLayer(
  cfg: VenueLocatorConfig,
  view: VenueLocatorView,
  dark: boolean
): VenueLocatorTileLayer {
  const base = cfg.tiles[view] ?? cfg.tiles.map;
  if (view === 'satellite' || cfg.darkTiles === 'never' || !dark) return base;
  return cfg.darkTileLayer ?? base;
}

function addTileLayer(L: any, map: any, cfg: VenueLocatorConfig, view: VenueLocatorView): any {
  const tile = resolveTileLayer(cfg, view, isDarkTheme());
  return L.tileLayer(tile.tileLayer, { attribution: tile.attribution, maxZoom: tile.maxZoom ?? 19 }).addTo(map);
}

/**
 * The CSS inversion filter is now only a FALLBACK: it applies when the street view is showing under
 * a dark theme and no dark basemap is configured. With `darkTileLayer` set (the default) the tiles
 * are already dark and inverting them would undo that. The class only marks eligibility — CSS gated
 * on [data-theme='dark'] decides whether it takes effect.
 */
function applyDarkTiles(mapEl: HTMLElement, cfg: VenueLocatorConfig, view: VenueLocatorView): void {
  const eligible = cfg.darkTiles === 'auto' && view !== 'satellite' && !cfg.darkTileLayer;
  mapEl.classList.toggle(vlMapInvertibleStyle(), eligible);
}
