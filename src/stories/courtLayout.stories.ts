/**
 * Court Layout — a venue's courts as an ordered, grouped grid.
 *
 * The companion to VenueLocator: that answers "where is this club", this answers "what can it host
 * at once, and on what". No map, no coordinates — each cell is an existing CourtCard.
 *
 * Run interactively: pnpm storybook
 * Run as tests:     pnpm storybook (one terminal) + pnpm test-storybook (other)
 */

import { within, userEvent, expect } from 'storybook/test';
import { buildCourtLayout } from '../components/court-layout/buildCourtLayout';
import { CourtLayoutCourt } from '../components/court-layout/types';

export default {
  title: 'Components/CourtLayout',
  tags: ['autodocs']
};

// Shaped like a real club: a numbered outdoor bank, a couple of indoor courts, one clay show court.
const COURTS: CourtLayoutCourt[] = [
  { courtId: 'c1', courtName: 'Court 1', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 1, floodlit: true },
  { courtId: 'c2', courtName: 'Court 2', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 2, floodlit: true },
  { courtId: 'c3', courtName: 'Court 3', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 3 },
  { courtId: 'c4', courtName: 'Court 4', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 4 },
  { courtId: 'c10', courtName: 'Court 10', indoorOutdoor: 'INDOOR', surfaceCategory: 'HARD', courtOrder: 10 },
  { courtId: 'c11', courtName: 'Court 11', indoorOutdoor: 'INDOOR', surfaceCategory: 'HARD', courtOrder: 11 },
  { courtId: 'cs', courtName: 'Stadium', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'CLAY', courtOrder: 12, floodlit: true }
];

const VENUE = { venueId: 'v1', venueName: 'Life Time Peachtree Corners', courts: COURTS };

const HEADING_LABEL = '.chc-cl-group-heading span:first-child';

function frame(el: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 24px; max-width: 1000px;';
  wrap.appendChild(el);
  return wrap;
}

export const Default = {
  name: 'Grouped by setting (default)',
  render: () => frame(buildCourtLayout(VENUE)),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('7 courts')).toBeInTheDocument();
    // 4 outdoor hard (courts 1-4) + 2 indoor hard (10, 11) + the clay stadium
    await expect(await canvas.findByText('4 outdoor hard, 2 indoor hard, 1 outdoor clay')).toBeInTheDocument();
    // court 1 is outdoor, so outdoor leads — group order follows courtOrder, not the alphabet
    const headings = [...canvasElement.querySelectorAll(HEADING_LABEL)].map((n) => n.textContent);
    await expect(headings).toEqual(['Outdoor', 'Indoor']);
  }
};

export const GroupedBySurface = {
  name: 'Grouped by surface',
  render: () => frame(buildCourtLayout(VENUE, { grouping: 'surface' })),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const headings = [...canvasElement.querySelectorAll(HEADING_LABEL)].map((n) => n.textContent);
    await expect(headings).toEqual(['Hard', 'Clay']);
  }
};

export const Ungrouped = {
  name: 'Ungrouped — one grid in courtOrder',
  render: () => frame(buildCourtLayout(VENUE, { grouping: 'none' })),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await expect(canvasElement.querySelectorAll('.chc-cl-group-heading')).toHaveLength(0);
    await expect(canvasElement.querySelectorAll('.chc-cl-grid')).toHaveLength(1);
  }
};

export const Pickleball = {
  name: 'Pickleball courts',
  render: () =>
    frame(
      buildCourtLayout(
        {
          venueName: 'Metro Pickleball Center',
          courts: [
            { courtId: 'p1', courtName: 'Court 1', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 1 },
            { courtId: 'p2', courtName: 'Court 2', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 2 },
            { courtId: 'p3', courtName: 'Court 3', indoorOutdoor: 'INDOOR', surfaceCategory: 'HARD', courtOrder: 3 }
          ]
        },
        { sport: 'pickleball' }
      )
    )
};

export const NoCourts = {
  name: 'Venue with no courts',
  render: () => frame(buildCourtLayout({ venueName: 'New Club', courts: [] })),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No courts recorded for this venue')).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll('.chc-cl-grid')).toHaveLength(0);
  }
};

export const PartialData = {
  name: 'Courts with unknown surface / setting',
  render: () =>
    frame(
      buildCourtLayout({
        venueName: 'Community Park',
        courts: [
          { courtId: 'u1', courtName: 'Court 1', courtOrder: 1 },
          { courtId: 'u2', courtName: 'Court 2', indoorOutdoor: 'OUTDOOR', courtOrder: 2 }
        ]
      })
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // an unknown setting is labelled, not silently merged into a known group
    const headings = [...canvasElement.querySelectorAll(HEADING_LABEL)].map((n) => n.textContent);
    await expect(headings).toEqual(['Unspecified', 'Outdoor']);
  }
};

export const ClickableCourts = {
  name: 'Clickable courts',
  render: () => {
    const readout = document.createElement('div');
    readout.style.cssText = 'margin-top: 16px; font: 13px/1.4 system-ui; color: var(--chc-text-secondary, #4b5563);';
    readout.textContent = 'No court selected';
    const wrap = frame(buildCourtLayout(VENUE, undefined, { onCourtClick: (c) => (readout.textContent = `Selected ${c.courtName}`) }));
    wrap.appendChild(readout);
    return wrap;
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Stadium'));
    await expect(await canvas.findByText('Selected Stadium')).toBeInTheDocument();
  }
};
