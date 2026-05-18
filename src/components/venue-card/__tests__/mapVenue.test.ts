import { mapVenueToCardData } from '../mapVenue';
import { describe, it, expect } from 'vitest';

describe('mapVenueToCardData', () => {
  it('returns empty defaults for null input', () => {
    const out = mapVenueToCardData(null);
    expect(out.venueId).toBe('');
    expect(out.venueName).toBe('');
    expect(out.courtCount).toBeUndefined();
  });

  it('maps identity + address', () => {
    const out = mapVenueToCardData({
      venueId: 'v1',
      venueName: 'Big Court',
      addresses: [{ city: 'Cary', state: 'NC', countryCode: 'USA' }]
    });
    expect(out.venueName).toBe('Big Court');
    expect(out.addressFormatted).toBe('Cary, NC, USA');
  });

  it('extracts lat/lng when present', () => {
    const out = mapVenueToCardData({
      venueId: 'v1',
      addresses: [{ city: 'Cary', latitude: 35.79, longitude: -78.78 }]
    });
    expect(out.latitude).toBe(35.79);
    expect(out.longitude).toBe(-78.78);
  });

  it('summarizes court breakdown', () => {
    const out = mapVenueToCardData({
      venueId: 'v1',
      courts: [
        { indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD' },
        { indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD' },
        { indoorOutdoor: 'INDOOR', surfaceCategory: 'HARD' }
      ]
    });
    expect(out.courtCount).toBe(3);
    expect(out.courtBreakdown).toContain('2 outdoor hard');
    expect(out.courtBreakdown).toContain('1 indoor hard');
    expect(out.outdoorCount).toBe(2);
    expect(out.indoorCount).toBe(1);
  });

  it('counts floodlit courts', () => {
    const out = mapVenueToCardData({
      venueId: 'v1',
      courts: [{ floodlit: true }, { floodlit: true }, { floodlit: false }]
    });
    expect(out.floodlitCount).toBe(2);
  });

  it('uses parent tournament sport as court-SVG fallback', () => {
    const out = mapVenueToCardData({ venueId: 'v1' }, { sport: 'tennis' });
    expect(out.courtSvgSport).toBe('tennis');
  });

  it('prefers venue-level court SVG over parent sport', () => {
    const out = mapVenueToCardData(
      {
        venueId: 'v1',
        courtSvgSport: 'pickleball'
      },
      { sport: 'tennis' }
    );
    expect(out.courtSvgSport).toBe('pickleball');
  });

  it('passes through isPrimary flag', () => {
    const out = mapVenueToCardData({ venueId: 'v1', isPrimary: true });
    expect(out.isPrimary).toBe(true);
  });
});
