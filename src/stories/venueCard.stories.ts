import { buildVenueCard } from '../components/venue-card/buildVenueCard';
import { mapVenueToCardData } from '../components/venue-card/mapVenue';
import { buildVenueSkeletonCard } from '../components/venue-card/buildSkeletonCard';
import { VenueCardData } from '../components/venue-card/types';

export default {
  title: 'Components/VenueCard',
  tags: ['autodocs']
};

const BASE: VenueCardData = {
  venueId: 'v1',
  venueName: 'Rick Macci Tennis Academy',
  addressFormatted: 'Boca Raton, FL, USA',
  courtCount: 8,
  courtBreakdown: '6 outdoor hard, 2 indoor hard',
  indoorCount: 2,
  outdoorCount: 6,
  floodlitCount: 4,
  isPrimary: true,
  courtSvgSport: 'tennis'
};

function makeFrame(card: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 24px; background: #f3f4f6; width: 280px;';
  wrap.appendChild(card);
  return wrap;
}

function makeGrid(cards: HTMLElement[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fill, minmax(224px, 1fr)); gap: 1rem; padding: 24px; background: #f3f4f6; max-width: 1100px;';
  for (const card of cards) wrap.appendChild(card);
  return wrap;
}

export const Default = {
  render: () => makeFrame(buildVenueCard(BASE, undefined, { onClick: (d) => console.log('open', d.venueId) }))
};

export const WithMap = {
  render: () =>
    makeFrame(
      buildVenueCard({
        ...BASE,
        venueName: 'Roland Garros',
        addressFormatted: 'Paris, FR',
        latitude: 48.8472,
        longitude: 2.2509
      })
    )
};

export const WithoutMap = {
  render: () => makeFrame(buildVenueCard({ ...BASE, latitude: undefined, longitude: undefined }))
};

export const NotPrimary = {
  render: () => makeFrame(buildVenueCard({ ...BASE, isPrimary: false }))
};

export const Skeleton = {
  render: () => makeFrame(buildVenueSkeletonCard())
};

export const FromFactoryVenue = {
  render: () => {
    const venue = {
      venueId: 'v-mock',
      venueName: 'CourtHive Test Facility',
      addresses: [{ city: 'Cary', state: 'NC', countryCode: 'USA', latitude: 35.79, longitude: -78.78 }],
      courts: [
        { indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD' },
        { indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD' },
        { indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', floodlit: true },
        { indoorOutdoor: 'INDOOR', surfaceCategory: 'HARD' }
      ],
      isPrimary: true
    };
    return makeFrame(
      buildVenueCard(mapVenueToCardData(venue, { sport: 'tennis' }), undefined, {
        onClick: (d) => console.log('open', d.venueId)
      })
    );
  }
};

export const ResponsiveGrid = {
  render: () =>
    makeGrid([
      buildVenueCard({ ...BASE, venueId: 'a', latitude: 35.79, longitude: -78.78 }),
      buildVenueCard({ ...BASE, venueId: 'b', venueName: 'Court 2', isPrimary: false }),
      buildVenueCard({ ...BASE, venueId: 'c', venueName: 'Roland Garros', latitude: 48.8472, longitude: 2.2509 }),
      buildVenueCard({ ...BASE, venueId: 'd', venueName: 'No Coords' })
    ])
};
