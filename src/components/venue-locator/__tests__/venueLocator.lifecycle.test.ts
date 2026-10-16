// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
const map = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('map initialization reached');
  })
);
vi.mock('leaflet', () => ({ default: { map } }));
import { buildVenueLocator, destroyVenueLocator } from '../buildVenueLocator';
describe('venue locator lifetime', () => {
  it('does not mount Leaflet after destruction during its import', async () => {
    const unavailable = vi.fn();
    const root = buildVenueLocator(
      { venueId: 'v', venueName: 'Venue', latitude: 0, longitude: 0 },
      {},
      { onMapUnavailable: unavailable }
    );
    destroyVenueLocator(root);
    await vi.dynamicImportSettled();
    expect(map).not.toHaveBeenCalled();
    expect(unavailable).not.toHaveBeenCalled();
  });
});
