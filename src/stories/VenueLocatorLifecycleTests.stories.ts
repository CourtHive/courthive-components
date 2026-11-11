/**
 * Venue Locator — destroyed while Leaflet is still loading.
 *
 * Leaflet is imported dynamically, so `buildVenueLocator` returns before the map mounts. A host that
 * destroys the locator inside that window (a drawer closed at once, a route change) must not get a map
 * mounted into a detached element, nor an `onMapUnavailable` for a locator that is gone. The guard itself
 * is unit-tested in `components/venue-locator/__tests__/venueLocator.lifecycle.test.ts`; this pins the
 * wiring, beside a CONTROL locator that does mount, so "no map" cannot mean "Leaflet never loaded".
 *
 * Run as tests: `pnpm test:stories src/stories/VenueLocatorLifecycleTests.stories.ts`
 */
import 'leaflet/dist/leaflet.css';
import { buildVenueLocator, destroyVenueLocator } from '../components/venue-locator/buildVenueLocator';
import { VenueLocatorData } from '../components/venue-locator/types';
import { Meta, StoryObj } from '@storybook/html-vite';
import { expect, fn, waitFor } from 'storybook/test';

const meta: Meta = {
  title: 'Cards/Venue Locator/Tests/Lifecycle',
  tags: ['!dev']
};
export default meta;

const VENUE: VenueLocatorData = { venueId: 'v', venueName: 'Venue', latitude: 33.9695, longitude: -84.2216 };
const unavailable = fn();

export const DestroyedDuringLeafletImportDoesNotMount: StoryObj = {
  render: () => {
    unavailable.mockClear();
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px;';

    const destroyed = buildVenueLocator({ ...VENUE, venueId: 'destroyed' }, {}, { onMapUnavailable: unavailable });
    // Synchronously, before the dynamic import can resolve: the window the guard exists for.
    destroyVenueLocator(destroyed);
    const control = buildVenueLocator({ ...VENUE, venueId: 'control' }, {}, { onMapUnavailable: unavailable });

    wrap.append(destroyed, control);
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const destroyed = canvasElement.querySelector('[data-venue-id="destroyed"]') as HTMLElement;
    const control = canvasElement.querySelector('[data-venue-id="control"]') as HTMLElement;

    // CONTROL: Leaflet loaded and mounted in this page.
    await waitFor(() => expect(control.querySelector('.leaflet-container')).not.toBeNull());

    await expect(destroyed.querySelector('.leaflet-container')).toBeNull();
    await expect(unavailable).not.toHaveBeenCalled();
  }
};
