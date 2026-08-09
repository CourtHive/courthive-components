/**
 * Venue Locator — one venue on a Leaflet map, courts listed beside it.
 *
 * Storybook is the DOM layer for this repo (the pure helpers are covered by vitest in
 * `src/components/venue-locator/__tests__`). The play functions below assert the component's own
 * chrome — header, court list, fallback, view toggle — never the tiles, so they neither depend on
 * nor wait for the network.
 *
 * Run interactively: pnpm storybook
 * Run as tests:     pnpm storybook (one terminal) + pnpm test-storybook (other)
 */

// A host that renders this component supplies leaflet AND its stylesheet; the story does the same.
// Without the stylesheet Leaflet's panes are unpositioned and the map paints as a broken band.
import 'leaflet/dist/leaflet.css';
import { within, userEvent, expect } from 'storybook/test';
import { buildVenueLocator } from '../components/venue-locator/buildVenueLocator';
import { VenueLocatorData } from '../components/venue-locator/types';

export default {
  title: 'Components/VenueLocator',
  tags: ['autodocs']
};

// Life Time Peachtree Corners — the largest venue in the ALTA facility corpus (48 courts).
const BASE: VenueLocatorData = {
  venueId: 'v-ltpc',
  venueName: 'Life Time Peachtree Corners',
  addressFormatted: '5155 Peachtree Pkwy, Norcross, GA 30092',
  latitude: 33.9695,
  longitude: -84.2216,
  courts: [
    { courtId: 'c1', courtName: 'Court 1', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 1, floodlit: true },
    { courtId: 'c2', courtName: 'Court 2', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 2, floodlit: true },
    { courtId: 'c3', courtName: 'Court 3', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 3 },
    { courtId: 'c10', courtName: 'Court 10', indoorOutdoor: 'INDOOR', surfaceCategory: 'HARD', courtOrder: 10 },
    { courtId: 'c11', courtName: 'Stadium', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'CLAY', courtOrder: 11 }
  ]
};

const ARIA_PRESSED = 'aria-pressed';

function frame(el: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 24px; max-width: 900px;';
  wrap.appendChild(el);
  return wrap;
}

export const Default = {
  render: () => frame(buildVenueLocator(BASE)),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Life Time Peachtree Corners')).toBeInTheDocument();
    await expect(await canvas.findByText('Courts (5)')).toBeInTheDocument();
    // courtOrder drives the order, so Court 10 sorts after Court 3 — not lexically after Court 1
    const names = [...canvasElement.querySelectorAll('.chc-vl-court-name')].map((n) => n.textContent);
    await expect(names).toEqual(['Court 1', 'Court 2', 'Court 3', 'Court 10', 'Stadium']);
  }
};

export const NoCoordinates = {
  name: 'No coordinates — degrades to header + courts',
  render: () => frame(buildVenueLocator({ ...BASE, latitude: undefined, longitude: undefined })),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No coordinates for this venue')).toBeInTheDocument();
    // the rest of the component stays usable
    await expect(await canvas.findByText('Courts (5)')).toBeInTheDocument();
    await expect(canvasElement.querySelector('.chc-vl-map')).toBeNull();
  }
};

export const ViewToggle = {
  name: 'Map / satellite toggle',
  render: () => frame(buildVenueLocator(BASE)),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const mapBtn = canvasElement.querySelector('button[data-view="map"]') as HTMLButtonElement;
    const satBtn = canvasElement.querySelector('button[data-view="satellite"]') as HTMLButtonElement;
    await expect(mapBtn.getAttribute(ARIA_PRESSED)).toBe('true');
    await expect(satBtn.getAttribute(ARIA_PRESSED)).toBe('false');

    await userEvent.click(satBtn);
    await expect(satBtn.getAttribute(ARIA_PRESSED)).toBe('true');
    await expect(mapBtn.getAttribute(ARIA_PRESSED)).toBe('false');
    // satellite imagery is never eligible for dark inversion — a false-colour photo is worse than none
    await expect(canvasElement.querySelector('.chc-vl-map--invertible')).toBeNull();
  }
};

export const CourtsBelow = {
  name: 'Courts below the map',
  render: () => frame(buildVenueLocator(BASE, { courtsLayout: 'below', height: '260px' }))
};

export const MapOnly = {
  name: 'Map only — no header, no court list',
  render: () => frame(buildVenueLocator(BASE, { courtsLayout: 'none', showHeader: false, showViewToggle: false })),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await expect(canvasElement.querySelector('.chc-vl-courts')).toBeNull();
    await expect(canvasElement.querySelector('.chc-vl-header')).toBeNull();
    await expect(canvasElement.querySelector('.chc-vl-toggle')).toBeNull();
  }
};

export const ClickableCourts = {
  name: 'Clickable courts',
  render: () => {
    const readout = document.createElement('div');
    readout.dataset.readout = 'true';
    readout.style.cssText = 'margin-top: 12px; font: 13px/1.4 system-ui; color: var(--chc-text-secondary, #4b5563);';
    readout.textContent = 'No court selected';
    const el = buildVenueLocator(BASE, undefined, {
      onCourtClick: (court) => {
        readout.textContent = `Selected ${court.courtName}`;
      }
    });
    const wrap = frame(el);
    wrap.appendChild(readout);
    return wrap;
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Stadium'));
    await expect(await canvas.findByText('Selected Stadium')).toBeInTheDocument();
    // a clickable court must be a real button, not a div with a handler
    await expect((canvasElement.querySelector('.chc-vl-court') as HTMLElement).tagName).toBe('BUTTON');
  }
};

export const NoCourts = {
  name: 'Venue with no courts',
  render: () => frame(buildVenueLocator({ ...BASE, courts: [] })),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await expect(canvasElement.querySelector('.chc-vl-courts')).toBeNull();
    await expect(canvasElement.querySelector('.chc-vl-mapwrap')).not.toBeNull();
  }
};
