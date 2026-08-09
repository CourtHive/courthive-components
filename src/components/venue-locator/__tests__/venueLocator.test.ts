import { describeCourt, hasVenueGeo, leafletCssMissing, resolveTileLayer, sortVenueCourts } from '../buildVenueLocator';
import { mergeVenueLocatorConfig, DEFAULT_VENUE_LOCATOR_CONFIG } from '../defaultConfig';
import { mapVenueToLocatorData } from '../mapVenue';
import { describe, it, expect } from 'vitest';

describe('mapVenueToLocatorData', () => {
  it('returns empty defaults for null input', () => {
    const out = mapVenueToLocatorData(null);
    expect(out.venueId).toBe('');
    expect(out.venueName).toBe('');
    expect(out.latitude).toBeUndefined();
    expect(out.courts).toEqual([]);
  });

  it('maps identity + address', () => {
    const out = mapVenueToLocatorData({
      venueId: 'v1',
      venueName: 'Big Court',
      addresses: [{ city: 'Cary', state: 'NC', countryCode: 'USA' }]
    });
    expect(out.venueName).toBe('Big Court');
    expect(out.addressFormatted).toBe('Cary, NC, USA');
  });

  it('takes coordinates from the address when the venue has none', () => {
    const out = mapVenueToLocatorData({ venueId: 'v1', addresses: [{ latitude: 35.79, longitude: -78.78 }] });
    expect(out.latitude).toBe(35.79);
    expect(out.longitude).toBe(-78.78);
  });

  it('prefers venue-level coordinates over the address', () => {
    const out = mapVenueToLocatorData({
      venueId: 'v1',
      latitude: 1,
      longitude: 2,
      addresses: [{ latitude: 35.79, longitude: -78.78 }]
    });
    expect(out.latitude).toBe(1);
    expect(out.longitude).toBe(2);
  });

  it('normalises court fields and synthesises missing ids/names', () => {
    const out = mapVenueToLocatorData({
      venueId: 'v1',
      courts: [{ indoorOutdoor: 'outdoor', surfaceCategory: 'HARD', floodlit: true }, {}]
    });
    expect(out.courts?.[0]).toMatchObject({ courtId: 'court-1', courtName: 'Court 1', indoorOutdoor: 'OUTDOOR' });
    expect(out.courts?.[1]).toMatchObject({ courtId: 'court-2', courtName: 'Court 2' });
  });

  it('drops an unrecognised indoorOutdoor rather than passing it through', () => {
    const out = mapVenueToLocatorData({ venueId: 'v1', courts: [{ indoorOutdoor: 'COVERED' }] });
    expect(out.courts?.[0].indoorOutdoor).toBeUndefined();
  });

  it('ignores non-finite coordinates', () => {
    const out = mapVenueToLocatorData({ venueId: 'v1', latitude: Number.NaN, longitude: Number.POSITIVE_INFINITY });
    expect(out.latitude).toBeUndefined();
    expect(out.longitude).toBeUndefined();
  });
});

describe('hasVenueGeo', () => {
  it('requires both coordinates to be finite numbers', () => {
    expect(hasVenueGeo({ venueId: 'v', venueName: 'V', latitude: 1, longitude: 2 })).toBe(true);
    expect(hasVenueGeo({ venueId: 'v', venueName: 'V', latitude: 1 })).toBe(false);
    expect(hasVenueGeo({ venueId: 'v', venueName: 'V' })).toBe(false);
    expect(hasVenueGeo({ venueId: 'v', venueName: 'V', latitude: Number.NaN, longitude: 2 })).toBe(false);
  });

  it('treats 0,0 as real coordinates', () => {
    // null island is a legitimate value; a truthiness check here would render the no-geo fallback
    expect(hasVenueGeo({ venueId: 'v', venueName: 'V', latitude: 0, longitude: 0 })).toBe(true);
  });
});

describe('sortVenueCourts', () => {
  const court = (courtName: string, courtOrder?: number) => ({ courtId: courtName, courtName, courtOrder });

  it('orders by courtOrder ascending when present', () => {
    const sorted = sortVenueCourts([court('C', 3), court('A', 1), court('B', 2)]);
    expect(sorted.map((c) => c.courtName)).toEqual(['A', 'B', 'C']);
  });

  it('falls back to natural-numeric name order', () => {
    const sorted = sortVenueCourts([court('Court 10'), court('Court 2'), court('Court 1')]);
    expect(sorted.map((c) => c.courtName)).toEqual(['Court 1', 'Court 2', 'Court 10']);
  });

  it('places courts carrying a courtOrder before those without one', () => {
    const sorted = sortVenueCourts([court('Unordered'), court('Ordered', 5)]);
    expect(sorted.map((c) => c.courtName)).toEqual(['Ordered', 'Unordered']);
  });

  it('does not mutate the input array', () => {
    const input = [court('B', 2), court('A', 1)];
    sortVenueCourts(input);
    expect(input.map((c) => c.courtName)).toEqual(['B', 'A']);
  });
});

describe('describeCourt', () => {
  it('joins setting and surface', () => {
    expect(describeCourt({ courtId: '1', courtName: '1', indoorOutdoor: 'INDOOR', surfaceCategory: 'CLAY' })).toBe(
      'indoor · clay'
    );
  });

  it('returns an empty string when nothing is known', () => {
    expect(describeCourt({ courtId: '1', courtName: '1' })).toBe('');
  });
});

describe('mergeVenueLocatorConfig', () => {
  it('returns the defaults untouched when no override is given', () => {
    expect(mergeVenueLocatorConfig()).toBe(DEFAULT_VENUE_LOCATOR_CONFIG);
  });

  it('applies a partial override without dropping the rest', () => {
    const merged = mergeVenueLocatorConfig({ zoom: 12, courtsLayout: 'none' });
    expect(merged.zoom).toBe(12);
    expect(merged.courtsLayout).toBe('none');
    expect(merged.tiles).toBe(DEFAULT_VENUE_LOCATOR_CONFIG.tiles);
  });

  it('honours explicitly falsey overrides', () => {
    // `??` rather than `||` matters here: showViewToggle:false must survive the merge
    const merged = mergeVenueLocatorConfig({ showViewToggle: false, showHeader: false, scrollWheelZoom: false });
    expect(merged.showViewToggle).toBe(false);
    expect(merged.showHeader).toBe(false);
  });

  it('defaults to a street tile source that is not the satellite one', () => {
    expect(DEFAULT_VENUE_LOCATOR_CONFIG.view).toBe('map');
    expect(DEFAULT_VENUE_LOCATOR_CONFIG.tiles.map.tileLayer).not.toBe(
      DEFAULT_VENUE_LOCATOR_CONFIG.tiles.satellite.tileLayer
    );
  });
});

describe('leafletCssMissing', () => {
  it('flags a container that is still statically positioned', () => {
    // leaflet's stylesheet sets `.leaflet-container { position: relative }`
    expect(leafletCssMissing('static')).toBe(true);
  });

  it('stays quiet once the stylesheet has positioned the container', () => {
    expect(leafletCssMissing('relative')).toBe(false);
    expect(leafletCssMissing('absolute')).toBe(false);
  });

  it('stays quiet when the position could not be measured', () => {
    // an unmeasurable container is not evidence of a missing stylesheet — a warning here would be
    // a false alarm in every non-DOM/SSR context
    expect(leafletCssMissing(undefined)).toBe(false);
    expect(leafletCssMissing('')).toBe(false);
  });
});

describe('resolveTileLayer', () => {
  const cfg = DEFAULT_VENUE_LOCATOR_CONFIG;

  it('uses the light street tiles under a light theme', () => {
    expect(resolveTileLayer(cfg, 'map', false)).toBe(cfg.tiles.map);
  });

  it('swaps to the dark basemap under a dark theme', () => {
    expect(resolveTileLayer(cfg, 'map', true)).toBe(cfg.darkTileLayer);
  });

  it('never darkens satellite — there is no dark equivalent of a photograph', () => {
    expect(resolveTileLayer(cfg, 'satellite', true)).toBe(cfg.tiles.satellite);
  });

  it('honours darkTiles:never', () => {
    const never = mergeVenueLocatorConfig({ darkTiles: 'never' });
    expect(resolveTileLayer(never, 'map', true)).toBe(never.tiles.map);
  });

  it('falls back to the light street tiles when no dark basemap is configured', () => {
    // this is the CSS-inversion path: the layer stays light and venue-locator.css inverts it
    const noDark = mergeVenueLocatorConfig({ darkTileLayer: null });
    expect(noDark.darkTileLayer).toBeNull();
    expect(resolveTileLayer(noDark, 'map', true)).toBe(noDark.tiles.map);
  });

  it('accepts a host-supplied dark basemap', () => {
    const custom = { tileLayer: 'https://example.test/{z}/{x}/{y}.png', attribution: 'test' };
    const cfg2 = mergeVenueLocatorConfig({ darkTileLayer: custom });
    expect(resolveTileLayer(cfg2, 'map', true)).toBe(custom);
  });

  it('ships a dark basemap by default that is a different source from the light one', () => {
    expect(cfg.darkTileLayer).not.toBeNull();
    expect(cfg.darkTileLayer?.tileLayer).not.toBe(cfg.tiles.map.tileLayer);
    expect(cfg.darkTileLayer?.attribution).toMatch(/CARTO/);
  });
});
