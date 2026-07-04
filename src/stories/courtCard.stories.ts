import { buildCourtCard } from '../components/court-card/buildCourtCard';
import { mapCourtToCardData } from '../components/court-card/mapCourt';
import { buildCourtSkeletonCard } from '../components/court-card/buildSkeletonCard';
import { CourtCardData } from '../components/court-card/types';

export default {
  title: 'Components/CourtCard',
  tags: ['autodocs']
};

const BASE: CourtCardData = {
  courtId: 'c1',
  courtName: 'Center Court',
  courtAbbreviation: 'CC',
  surfaceLabel: 'Outdoor · Hard',
  indoorOutdoor: 'OUTDOOR',
  surfaceCategory: 'HARD',
  floodlit: true,
  availabilitySummary: '08:00 – 22:00',
  courtSvgSport: 'tennis'
};

function makeFrame(card: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 24px; background: #f3f4f6; width: 260px;';
  wrap.appendChild(card);
  return wrap;
}

function makeGrid(cards: HTMLElement[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; padding: 24px; background: #f3f4f6; max-width: 1100px;';
  for (const card of cards) wrap.appendChild(card);
  return wrap;
}

export const Default = {
  render: () => makeFrame(buildCourtCard(BASE, undefined, { onClick: (d) => console.log('open', d.courtId) }))
};

export const IndoorClay = {
  render: () =>
    makeFrame(
      buildCourtCard({
        ...BASE,
        courtId: 'c2',
        courtName: 'Indoor Clay 1',
        courtAbbreviation: 'IC1',
        surfaceLabel: 'Indoor · Clay',
        indoorOutdoor: 'INDOOR',
        surfaceCategory: 'CLAY',
        floodlit: false
      })
    )
};

export const NoImage = {
  render: () => makeFrame(buildCourtCard(BASE, { showImage: false }))
};

export const AvailabilityFooter = {
  render: () =>
    makeFrame(
      buildCourtCard(BASE, {
        body: ['title', 'abbreviation'],
        footer: ['surface', 'availability']
      })
    )
};

export const Skeleton = {
  render: () => makeFrame(buildCourtSkeletonCard())
};

export const FromFactoryCourt = {
  render: () => {
    const court = {
      courtId: 'court-mock',
      courtName: 'Grandstand',
      courtAbbreviation: 'GS',
      indoorOutdoor: 'outdoor',
      surfaceCategory: 'grass',
      floodlit: true,
      notes: 'Show court — reserved for feature matches'
    };
    return makeFrame(
      buildCourtCard(mapCourtToCardData(court, { sport: 'tennis' }), undefined, {
        onClick: (d) => console.log('open', d.courtId)
      })
    );
  }
};

export const ResponsiveGrid = {
  render: () =>
    makeGrid([
      buildCourtCard({ ...BASE, courtId: 'a', courtName: 'Court 1' }),
      buildCourtCard({
        ...BASE,
        courtId: 'b',
        courtName: 'Court 2',
        surfaceLabel: 'Indoor · Hard',
        indoorOutdoor: 'INDOOR',
        floodlit: false
      }),
      buildCourtCard({
        ...BASE,
        courtId: 'c',
        courtName: 'Clay 3',
        surfaceLabel: 'Outdoor · Clay',
        surfaceCategory: 'CLAY'
      }),
      buildCourtCard({ ...BASE, courtId: 'd', courtName: 'Court 4', courtSvgSport: 'pickleball' })
    ])
};
