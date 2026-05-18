import { mapTournamentToCardData } from '../mapTournament';
import { describe, it, expect } from 'vitest';

const NOW = new Date('2026-05-17T12:00:00Z');

describe('mapTournamentToCardData', () => {
  it('returns empty defaults for null input', () => {
    const out = mapTournamentToCardData(null);
    expect(out.tournamentId).toBe('');
    expect(out.tournamentName).toBe('');
    expect(out.participantCount).toBeUndefined();
  });

  it('maps core identity + dates', () => {
    const out = mapTournamentToCardData(
      {
        tournamentId: 't1',
        tournamentName: 'Spring Slam',
        startDate: '2026-05-22',
        endDate: '2026-05-24'
      },
      { now: NOW }
    );
    expect(out.tournamentId).toBe('t1');
    expect(out.tournamentName).toBe('Spring Slam');
    expect(out.startDate).toBe('2026-05-22');
    expect(out.endDate).toBe('2026-05-24');
    expect(out.dateRangeFormatted).toBeTruthy();
    expect(out.dateRangeFormatted).toContain('2026');
  });

  it('extracts URL image from onlineResources', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      onlineResources: [
        { name: 'tournamentImage', resourceType: 'URL', url: 'https://example.com/img.png' }
      ]
    });
    expect(out.tournamentImageURL).toBe('https://example.com/img.png');
  });

  it('extracts court SVG sport identifier', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      onlineResources: [
        { name: 'tournamentImage', resourceSubType: 'COURT_SVG', identifier: 'tennis' }
      ]
    });
    expect(out.courtSvgSport).toBe('tennis');
  });

  it('formats venue location with city, region, country', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      venues: [
        {
          venueName: 'Big Court',
          addresses: [{ city: 'Buford', state: 'GA', countryCode: 'USA' }]
        }
      ]
    });
    expect(out.location).toBe('Buford, GA, USA');
  });

  it('falls back to venueName when no address present', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      venues: [{ venueName: 'Big Court' }]
    });
    expect(out.location).toBe('Big Court');
  });

  it('computes participantCount', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      participants: [{ participantId: 'p1' }, { participantId: 'p2' }, { participantId: 'p3' }]
    });
    expect(out.participantCount).toBe(3);
  });

  it('resolves status pill via statusResolver', () => {
    const out = mapTournamentToCardData(
      {
        tournamentId: 't1',
        startDate: '2026-05-15',
        endDate: '2026-05-20'
      },
      { now: NOW }
    );
    expect(out.status?.kind).toBe('live');
  });

  it('formats fee range from registrationProfile.entryFees', () => {
    const out = mapTournamentToCardData({
      tournamentId: 't1',
      registrationProfile: {
        entryFees: [
          { amount: 40, currencyCode: 'USD' },
          { amount: 85, currencyCode: 'USD' }
        ]
      }
    });
    expect(out.feeFormatted).toContain('40');
    expect(out.feeFormatted).toContain('85');
  });

  it('respects statusOverride', () => {
    const out = mapTournamentToCardData(
      { tournamentId: 't1', startDate: '2026-05-15', endDate: '2026-05-20' },
      { now: NOW, statusOverride: null }
    );
    expect(out.status).toBeNull();
  });
});
