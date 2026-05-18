/**
 * Combined cards gallery — visual cross-check for tournament-card,
 * event-card, and venue-card side-by-side. Useful for confirming visual
 * consistency (typography, status pill placement, dark-mode behaviour).
 */

import { buildEventCard } from '../components/event-card/buildEventCard';
import { buildTournamentCard } from '../components/tournament-card/buildTournamentCard';
import { buildVenueCard } from '../components/venue-card/buildVenueCard';

export default {
  title: 'Components/CardsGallery',
  tags: ['autodocs']
};

function makeSection(title: string, cards: HTMLElement[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';

  const heading = document.createElement('h3');
  heading.textContent = title;
  heading.style.cssText = 'margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--chc-text-secondary, #4b5563);';
  wrap.appendChild(heading);

  const grid = document.createElement('div');
  grid.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fill, minmax(224px, 1fr)); gap: 1rem;';
  for (const card of cards) grid.appendChild(card);
  wrap.appendChild(grid);
  return wrap;
}

function makeGallery(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'display: flex; flex-direction: column; gap: 2rem; padding: 24px; background: var(--chc-bg-secondary, #f3f4f6); max-width: 1100px;';

  wrap.appendChild(
    makeSection('Tournaments', [
      buildTournamentCard({
        tournamentId: 't1',
        tournamentName: 'CourtHive Open',
        location: 'Cary, NC, USA',
        dateRangeFormatted: 'May 22 – May 24, 2026',
        participantCount: 34,
        feeFormatted: 'USD $60.00',
        status: { kind: 'closing-soon', label: 'Closing Soon' },
        courtSvgSport: 'tennis'
      })
    ])
  );

  wrap.appendChild(
    makeSection('Events', [
      buildEventCard({
        eventId: 'e1',
        eventName: "Men's Open Singles",
        categoryLabel: 'Open',
        eventType: 'SINGLES',
        gender: 'MALE',
        drawCount: 1,
        drawSummary: '32 SE',
        entryCount: 28,
        matchUpCounts: { total: 31, completed: 14, scheduled: 6, inProgress: 2 },
        status: { kind: 'live', label: 'Live' },
        courtSvgSport: 'tennis'
      })
    ])
  );

  wrap.appendChild(
    makeSection('Venues', [
      buildVenueCard({
        venueId: 'v1',
        venueName: 'CourtHive Test Facility',
        addressFormatted: 'Cary, NC, USA',
        latitude: 35.79,
        longitude: -78.78,
        courtCount: 8,
        courtBreakdown: '6 outdoor hard, 2 indoor hard',
        indoorCount: 2,
        outdoorCount: 6,
        floodlitCount: 4,
        isPrimary: true
      })
    ])
  );

  return wrap;
}

export const Gallery = { render: () => makeGallery() };
