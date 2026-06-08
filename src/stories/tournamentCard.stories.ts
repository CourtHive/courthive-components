import { buildTournamentCard } from '../components/tournament-card/buildTournamentCard';
import { mapTournamentToCardData } from '../components/tournament-card/mapTournament';
import { buildSkeletonCard } from '../components/tournament-card/buildSkeletonCard';
import { TournamentCardData } from '../components/tournament-card/types';

import courtHiveLogo from '../../.storybook/CourtHive.svg';

export default {
  title: 'Components/TournamentCard',
  tags: ['autodocs']
};

const BASE: TournamentCardData = {
  tournamentId: 't1',
  tournamentName: 'MTP 2026 May Indoor Tournament / $1,000 Moneyball (DUPR 4.9 Below)',
  location: 'Buford, GA, USA',
  dateRangeFormatted: 'May 22 – May 24, 2026',
  participantCount: 34,
  feeFormatted: 'USD $60.00',
  status: { kind: 'closing-soon', label: 'Closing Soon' },
  courtSvgSport: 'pickleball'
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

// ── Single card variants ──

export const Default = {
  render: () =>
    makeFrame(
      buildTournamentCard(BASE, undefined, {
        onClick: (d) => console.log('clicked', d.tournamentId)
      })
    )
};

export const WithURLImage = {
  render: () =>
    makeFrame(
      buildTournamentCard({
        ...BASE,
        tournamentImageURL: courtHiveLogo
      })
    )
};

export const TennisFallbackSvg = {
  render: () => makeFrame(buildTournamentCard({ ...BASE, courtSvgSport: 'tennis' }))
};

export const NoImageFallback = {
  render: () => makeFrame(buildTournamentCard({ ...BASE, courtSvgSport: undefined }))
};

export const Skeleton = {
  render: () => makeFrame(buildSkeletonCard())
};

export const OfflineBadge = {
  render: () => makeFrame(buildTournamentCard({ ...BASE, offline: true }))
};

// ── Status pill variants ──

export const StatusLive = {
  render: () =>
    makeFrame(
      buildTournamentCard({ ...BASE, status: { kind: 'live', label: 'Live' } })
    )
};

export const StatusCompleted = {
  render: () =>
    makeFrame(
      buildTournamentCard({
        ...BASE,
        status: { kind: 'completed', label: 'Completed' }
      })
    )
};

export const StatusCancelled = {
  render: () =>
    makeFrame(
      buildTournamentCard({
        ...BASE,
        status: { kind: 'cancelled', label: 'Cancelled' }
      })
    )
};

export const StatusRegistrationOpens = {
  render: () =>
    makeFrame(
      buildTournamentCard({
        ...BASE,
        status: { kind: 'registration-opens', label: 'Opens Jun 1' }
      })
    )
};

export const StatusNone = {
  render: () => makeFrame(buildTournamentCard({ ...BASE, status: null }))
};

// ── Fee variants ──

export const FeeRange = {
  render: () =>
    makeFrame(
      buildTournamentCard({ ...BASE, feeFormatted: 'USD $40.00 – $85.00' })
    )
};

export const FeeFromMixed = {
  render: () =>
    makeFrame(buildTournamentCard({ ...BASE, feeFormatted: 'From EUR €40.00' }))
};

export const NoFee = {
  render: () => makeFrame(buildTournamentCard({ ...BASE, feeFormatted: null }))
};

// ── Mapper round-trip ──

export const FromTournamentRecord = {
  render: () => {
    const tournament = {
      tournamentId: 'mock-1',
      tournamentName: 'Mock Tournament From Factory Record',
      startDate: '2026-05-22',
      endDate: '2026-05-24',
      onlineResources: [
        { name: 'tournamentImage', resourceSubType: 'COURT_SVG', identifier: 'tennis' }
      ],
      venues: [
        {
          venueName: 'Tennis Hub',
          addresses: [{ city: 'Cary', state: 'NC', countryCode: 'USA' }]
        }
      ],
      participants: Array(48).fill({}),
      registrationProfile: {
        entryFees: [
          { amount: 40, currencyCode: 'USD' },
          { amount: 85, currencyCode: 'USD' }
        ],
        entriesClose: new Date(Date.now() + 3 * 86_400_000).toISOString()
      }
    };
    const data = mapTournamentToCardData(tournament);
    return makeFrame(buildTournamentCard(data, undefined, {
      onClick: (d) => console.log('open', d.tournamentId)
    }));
  }
};

// ── Grid layout (default usage in TMX) ──

const GRID_VARIANTS: TournamentCardData[] = [
  { ...BASE, tournamentId: 'a', tournamentName: 'Spring Classic', status: { kind: 'closing-soon', label: 'Closing Soon' } },
  { ...BASE, tournamentId: 'b', tournamentName: 'Memorial Day Open', status: { kind: 'live', label: 'Live' }, courtSvgSport: 'tennis' },
  { ...BASE, tournamentId: 'c', tournamentName: 'Bent Tree Showdown', status: { kind: 'registration-opens', label: 'Opens Jun 1' }, courtSvgSport: 'pickleball' },
  { ...BASE, tournamentId: 'd', tournamentName: 'Summer Slam (Last Year)', status: { kind: 'completed', label: 'Completed' } },
  { ...BASE, tournamentId: 'e', tournamentName: 'Weather-Cancelled Event', status: { kind: 'cancelled', label: 'Cancelled' }, feeFormatted: null, participantCount: 0 },
  { ...BASE, tournamentId: 'f', tournamentName: 'Single Day Tourney', status: null, dateRangeFormatted: 'May 30, 2026', courtSvgSport: 'badminton' }
];

export const ResponsiveGrid = {
  render: () =>
    makeGrid(
      GRID_VARIANTS.map((d) =>
        buildTournamentCard(d, undefined, {
          onClick: (data) => console.log('open', data.tournamentId)
        })
      )
    )
};

export const SkeletonGrid = {
  render: () => makeGrid(Array.from({ length: 6 }, () => buildSkeletonCard()))
};

// ── Tier chip variants ──

export const TierITFJunior = {
  render: () =>
    makeFrame(
      buildTournamentCard({
        ...BASE,
        tournamentName: 'Wimbledon Junior Championships',
        tournamentTier: { system: 'ITF_JUNIOR', value: 'J500', numericRank: 4 }
      })
    )
};

export const TierATP1000 = {
  render: () =>
    makeFrame(
      buildTournamentCard({
        ...BASE,
        tournamentName: 'Miami Open',
        tournamentTier: { system: 'ATP', value: 'Masters 1000', numericRank: 2 }
      })
    )
};

export const TierPPAGold = {
  render: () =>
    makeFrame(
      buildTournamentCard({
        ...BASE,
        tournamentName: 'Mesa Pickleball Classic',
        tournamentTier: { system: 'PPA', value: 'Gold' }
      })
    )
};

export const TierGrid = {
  render: () =>
    makeGrid([
      buildTournamentCard({
        ...BASE,
        tournamentId: 'g1',
        tournamentName: 'Grand Slam',
        tournamentTier: { system: 'ATP', value: 'Grand Slam', numericRank: 1 }
      }),
      buildTournamentCard({
        ...BASE,
        tournamentId: 'g2',
        tournamentName: 'Masters 1000',
        tournamentTier: { system: 'ATP', value: '1000', numericRank: 2 }
      }),
      buildTournamentCard({
        ...BASE,
        tournamentId: 'g3',
        tournamentName: 'No Tier Set'
      }),
      buildTournamentCard({
        ...BASE,
        tournamentId: 'g4',
        tournamentName: 'ITF Junior J500',
        tournamentTier: { system: 'ITF_JUNIOR', value: 'J500', numericRank: 4 }
      })
    ])
};
